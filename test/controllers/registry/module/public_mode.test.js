/*!
 * cnpmjs.org - test/controllers/registry/module/public_mode.test.js
 * Copyright(c) 2014 dead_horse <dead_horse@qq.com>
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 */

var should = require('should');
var request = require('supertest');
var mm = require('mm');
var pedding = require('pedding');
var config = require('../../../../config');
var app = require('../../../../servers/registry');
var utils = require('../../../utils');

describe('controllers/registry/module/public_module.test.js', function () {
  beforeEach(function () {
    mm(config, 'enablePrivate', false);
  });
  before(function (done) {
    mm(config, 'enablePrivate', false);
    mm(config, 'forcePublishWithScope', false);
    app = app.listen(0, function () {
      done = pedding(2, done);
      // name: publictestmodule
      var pkg = utils.getPackage('publictestmodule', '0.0.1', utils.otherUser);

      request(app)
      .put('/' + pkg.name)
      .set('authorization', utils.otherUserAuth)
      .send(pkg)
      .expect(201, function (err) {
        should.not.exist(err);
        pkg = utils.getPackage('publictestmodule', '0.0.2', utils.otherUser);
        // publish 0.0.2
        request(app)
        .put('/' + pkg.name)
        .set('authorization', utils.otherUserAuth)
        .send(pkg)
        .expect(201, done);
      });

      // publicputmodule@0.1.9
      var testpkg = utils.getPackage('publicputmodule', '0.1.9', utils.otherUser);

      request(app)
      .put('/' + testpkg.name)
      .set('authorization', utils.otherUserAuth)
      .send(pkg)
      .expect(201, done);
    });
  });
  afterEach(mm.restore);

  describe('PUT /:name publish new flow addPackageAndDist()', function () {
    beforeEach(function () {
      mm(config, 'enablePrivate', false);
      mm(config, 'forcePublishWithScope', false);
    });

    it('should publish with tgz base64, addPackageAndDist()', function (done) {
      var pkg = utils.getPackage('publicpublishmodule', '0.0.2', utils.otherUser);
      request(app)
      .put('/' + pkg.name)
      .set('authorization', utils.otherUserAuth)
      .send(pkg)
      .expect(201, function (err, res) {
        should.not.exist(err);
        res.body.should.have.keys('ok', 'rev');
        res.body.ok.should.equal(true);
        pkg = utils.getPackage('publicpublishmodule', '0.0.2', utils.otherUser);
        // upload again should 403
        request(app)
        .put('/' + pkg.name)
        .set('authorization', utils.otherUserAuth)
        .send(pkg)
        .expect(403, function (err, res) {
          should.not.exist(err);
          res.body.should.eql({
            error: 'forbidden',
            reason: 'cannot modify pre-existing version: 0.0.2'
          });
          done();
        });
      });
    });

    it('should other user pulbish 403', function (done) {
      var pkg = utils.getPackage('publicpublishmodule', '0.0.3', utils.secondUser);
      request(app)
      .put('/' + pkg.name)
      .set('authorization', utils.secondUserAuth)
      .send(pkg)
      .expect(403, done);
    });

    it('should admin pulbish 403', function (done) {
      var pkg = utils.getPackage('publicpublishmodule', '0.0.3', utils.admin);
      request(app)
      .put('/' + pkg.name)
      .set('authorization', utils.adminAuth)
      .send(pkg)
      .expect(403, done);
    });

    it('should publish with scope, addPackageAndDist()', function (done) {
      mm(config, 'forcePublishWithScope', false);
      var pkg = utils.getPackage('@cnpm/publicpublishmodule', '0.0.2', utils.otherUser);
      request(app)
      .put('/' + pkg.name)
      .set('authorization', utils.otherUserAuth)
      .send(pkg)
      .expect(201, function (err, res) {
        should.not.exist(err);
        res.body.should.have.keys('ok', 'rev');
        res.body.ok.should.equal(true);

        // upload again should 403
        request(app)
        .put('/' + pkg.name)
        .set('authorization', utils.otherUserAuth)
        .send(pkg)
        .expect(403, function (err, res) {
          should.not.exist(err);
          res.body.should.eql({
            error: 'forbidden',
            reason: 'cannot modify pre-existing version: 0.0.2'
          });
          done();
        });
      });
    });

    describe('forcePublishWithScope = true', function () {
      it('should publish without scope 403, addPackageAndDist()', function (done) {
        mm(config, 'forcePublishWithScope', false);
        var pkg = utils.getPackage('publicpublishmodule', '0.0.2');
        request(app)
        .put('/' + pkg.name)
        .set('authorization', utils.otherUserAuth)
        .send(pkg)
        .expect(403, done);
      });

      it('should admin publish without scope ok, addPackageAndDist()', function (done) {
        mm(config, 'forcePublishWithScope', false);
        var pkg = utils.getPackage('publicpublishmodule1', '0.0.4', utils.admin);
        request(app)
        .put('/' + pkg.name)
        .set('authorization', utils.adminAuth)
        .send(pkg)
        .expect(201, done);
      });
    });
  });

  describe('PUT /:name/-rev/:rev removeWithVersions', function () {
    var withoutScopeRev;
    before(function (done) {
      mm(config, 'enablePrivate', false);
      mm(config, 'forcePublishWithScope', false);
      var pkg = utils.getPackage('publicremovemodule', '0.0.1', utils.otherUser);
      request(app)
      .put('/' + pkg.name)
      .set('authorization', utils.otherUserAuth)
      .send(pkg)
      .expect(201, function (err, res) {
        should.not.exist(err);
        res.body.should.have.keys('ok', 'rev');
        res.body.ok.should.equal(true);

        pkg = utils.getPackage('publicremovemodule', '0.0.2', utils.otherUser);
        request(app)
        .put('/' + pkg.name)
        .set('authorization', utils.otherUserAuth)
        .send(pkg)
        .expect(201, function (err, res) {
          should.not.exist(err);
          withoutScopeRev = res.body.rev;
          done();
        });
      });
    });

    it('should remove with version ok', function (done) {
      request(app)
      .put('/publicremovemodule/-rev/' + withoutScopeRev)
      .set('authorization', utils.otherUserAuth)
      .send({
        versions: {
          '0.0.1': {}
        }
      })
      .expect(201, done);
    });

    it('should no auth user remove 403', function (done) {
      request(app)
      .put('/publicremovemodule/-rev/' + withoutScopeRev)
      .set('authorization', utils.secondUserAuth)
      .send({
        versions: {
          '0.0.1': {}
        }
      })
      .expect(403, done);
    });

    it('should admin remove ok', function (done) {
      request(app)
      .put('/publicremovemodule/-rev/' + withoutScopeRev)
      .set('authorization', utils.adminAuth)
      .send({
        versions: {
          '0.0.1': {}
        }
      })
      .expect(201, done);
    });

    describe('forcePublishWithScope = true', function () {
      var withScopeRev;
      before(function (done) {
        mm(config, 'enablePrivate', false);
        mm(config, 'forcePublishWithScope', true);
        var pkg = utils.getPackage('@cnpm/publicremovemodule', '0.0.1', utils.otherUser);
        request(app)
        .put('/' + pkg.name)
        .set('authorization', utils.otherUserAuth)
        .send(pkg)
        .expect(201, function (err, res) {
          should.not.exist(err);
          res.body.should.have.keys('ok', 'rev');
          res.body.ok.should.equal(true);

          pkg = utils.getPackage('@cnpm/publicremovemodule', '0.0.2', utils.otherUser);
          request(app)
          .put('/' + pkg.name)
          .set('authorization', utils.otherUserAuth)
          .send(pkg)
          .expect(201, function (err, res) {
            should.not.exist(err);
            withScopeRev = res.body.rev;
            done();
          });
        });
      });

      it('should remove without scope 403', function (done) {
        mm(config, 'forcePublishWithScope', true);
        request(app)
        .put('/publicremovemodule/-rev/' + withoutScopeRev)
        .set('authorization', utils.otherUserAuth)
        .send({
          versions: {
            '0.0.1': {}
          }
        })
        .expect(403, done);
      });

      it('should admin remove without scope ok', function (done) {
        mm(config, 'forcePublishWithScope', true);
        request(app)
        .put('/publicremovemodule/-rev/' + withoutScopeRev)
        .set('authorization', utils.adminAuth)
        .send({
          versions: {
            '0.0.1': {}
          }
        })
        .expect(201, done);
      });

      it('should remove with scope ok', function (done) {
        mm(config, 'forcePublishWithScope', true);
        request(app)
        .put('/@cnpm/publicremovemodule/-rev/' + withScopeRev)
        .set('authorization', utils.otherUserAuth)
        .send({
          versions: {
            '0.0.1': {}
          }
        })
        .expect(201, done);
      });

      it('should admin remove with scope ok', function (done) {
        mm(config, 'forcePublishWithScope', true);
        request(app)
        .put('/@cnpm/publicremovemodule/-rev/' + withScopeRev)
        .set('authorization', utils.adminAuth)
        .send({
          versions: {
            '0.0.1': {}
          }
        })
        .expect(201, done);
      });
    });
  });

  describe('DELETE /:name/download/:filename/-rev/:rev', function () {
    var withoutScopeRev;
    beforeEach(function () {
      mm(config, 'enablePrivate', false);
      mm(config, 'forcePublishWithScope', false);
    });
    beforeEach(function (done) {
      mm(config, 'enablePrivate', false);
      mm(config, 'forcePublishWithScope', false);
      var pkg = utils.getPackage('public-test-delete-download-module', '0.1.9', utils.otherUser);
      request(app)
      .put('/' + pkg.name)
      .set('content-type', 'application/json')
      .set('authorization', utils.otherUserAuth)
      .send(pkg)
      .end(function (err, res) {
        should.not.exist(err);
        if (res.body.rev) {
          withoutScopeRev = res.body.rev;
        }
        done();
      });
    });

    it('should delete 403 when auth error', function (done) {
      request(app)
      .del('/public-test-delete-download-module/download/public-test-delete-download-module-0.1.9.tgz/-rev/' + withoutScopeRev)
      .set('authorization', utils.secondUserAuth)
      .expect(403, done);
    });

    it('should delete file ok', function (done) {
      request(app)
      .del('/public-test-delete-download-module/download/public-test-delete-download-module-0.1.9.tgz/-rev/' + withoutScopeRev)
      .set('authorization', utils.otherUserAuth)
      .expect(200, done);
    });

    it('should admin delete file ok', function (done) {
      request(app)
      .del('/public-test-delete-download-module/download/public-test-delete-download-module-0.1.9.tgz/-rev/' + withoutScopeRev)
      .set('authorization', utils.adminAuth)
      .expect(200, done);
    });

    describe('forcePublishWithScope = true', function () {
      var withScopeRev;
      beforeEach(function () {
        mm(config, 'enablePrivate', false);
        mm(config, 'forcePublishWithScope', true);
      });
      beforeEach(function (done) {
        mm(config, 'enablePrivate', false);
        mm(config, 'forcePublishWithScope', true);
        var pkg = utils.getPackage('@cnpm/public-test-delete-download-module', '0.1.9', utils.otherUser);
        request(app)
        .put('/' + pkg.name)
        .set('content-type', 'application/json')
        .set('authorization', utils.otherUserAuth)
        .send(pkg)
        .end(function (err, res) {
          should.not.exist(err);
          if (res.body.rev) {
            withScopeRev = res.body.rev;
          }
          done();
        });
      });

      it('should delete file without scope 403', function (done) {
        request(app)
        .del('/public-test-delete-download-module/download/public-test-delete-download-module-0.1.9.tgz/-rev/' + withoutScopeRev)
        .set('authorization', utils.otherUserAuth)
        .expect(403, done);
      });

      it('should admin delete file without scope ok', function (done) {
        request(app)
        .del('/public-test-delete-download-module/download/public-test-delete-download-module-0.1.9.tgz/-rev/' + withoutScopeRev)
        .set('authorization', utils.adminAuth)
        .expect(200, done);
      });
      it('should delete file with scope ok', function (done) {
        request(app)
        .del('/@cnpm/public-test-delete-download-module/download/@cnpm/public-test-delete-download-module-0.1.9.tgz/-rev/' + withScopeRev)
        .set('authorization', utils.otherUserAuth)
        .expect(200, done);
      });

      it('should admin delete file with scope ok', function (done) {
        request(app)
        .del('/@cnpm/public-test-delete-download-module/download/@cnpm/public-test-delete-download-module-0.1.9.tgz/-rev/' + withScopeRev)
        .set('authorization', utils.adminAuth)
        .expect(200, done);
      });
    });
  });

  describe('PUT /:name/:tag updateTag()', function () {
    it('should create new tag ok', function (done) {
      request(app)
      .put('/publictestmodule/newtag')
      .set('content-type', 'application/json')
      .set('authorization', utils.otherUserAuth)
      .send('"0.0.1"')
      .expect(201, done);
    });

    it('shold update tag not maintainer 403', function (done) {
      request(app)
      .put('/publictestmodule/newtag')
      .set('content-type', 'application/json')
      .set('authorization', utils.secondUserAuth)
      .send('"0.0.1"')
      .expect(403, done);
    });

    it('should admin update tag ok', function (done) {
      request(app)
      .put('/publictestmodule/newtag')
      .set('content-type', 'application/json')
      .set('authorization', utils.adminAuth)
      .send('"0.0.1"')
      .expect(201, done);
    });
  });

  describe('DELETE /:name/-rev/:rev', function () {
    describe('remove all modules by name', function () {
      beforeEach(function () {
        mm(config, 'enablePrivate', false);
        mm(config, 'forcePublishWithScope', false);
      });
      before(function (done) {
        mm(config, 'enablePrivate', false);
        mm(config, 'forcePublishWithScope', false);
        var pkg = utils.getPackage('public-remove-all-module', '0.0.1', utils.otherUser);
        request(app)
        .put('/public-remove-all-module')
        .set('content-type', 'application/json')
        .set('authorization', utils.otherUserAuth)
        .send(pkg)
        .expect(201, function (err) {
          should.not.exist(err);
          var pkg = utils.getPackage('public-remove-all-module-admin', '0.0.1', utils.otherUser);
          request(app)
          .put('/public-remove-all-module-admin')
          .set('content-type', 'application/json')
          .set('authorization', utils.otherUserAuth)
          .send(pkg)
          .expect(201, done);
        });
      });

      it('should fail when user not maintainer', function (done) {
        request(app)
        .del('/public-remove-all-module/-rev/1')
        .set('authorization', utils.secondUserAuth)
        .expect(403, function (err, res) {
          should.not.exist(err);
          res.body.should.eql({
            error: 'forbidden user',
            reason: 'cnpmjstest102 not authorized to modify public-remove-all-module'
          });
          done();
        });
      });

      it('should maintainer remove ok', function (done) {
        request(app)
        .del('/public-remove-all-module/-rev/1')
        .set('authorization', utils.otherUserAuth)
        .expect(200, function (err, res) {
          should.not.exist(err);
          should.not.exist(res.headers['set-cookie']);
          done();
        });
      });

      it('should admin remove ok', function (done) {
        request(app)
        .del('/public-remove-all-module-admin/-rev/1')
        .set('authorization', utils.adminAuth)
        .expect(200, function (err, res) {
          should.not.exist(err);
          should.not.exist(res.headers['set-cookie']);
          done();
        });
      });

      describe('forcePublishWithScope = true', function () {
        before(function (done) {
          mm(config, 'enablePrivate', false);
          mm(config, 'forcePublishWithScope', true);
          var pkg = utils.getPackage('@cnpm/public-remove-all-module', '0.0.1', utils.otherUser);
          request(app)
          .put('/@cnpm/public-remove-all-module')
          .set('content-type', 'application/json')
          .set('authorization', utils.otherUserAuth)
          .send(pkg)
          .expect(201, function (err) {
            should.not.exist(err);
            var pkg = utils.getPackage('@cnpm/public-remove-all-module-admin', '0.0.1', utils.otherUser);
            request(app)
            .put('/@cnpm/public-remove-all-module-admin')
            .set('content-type', 'application/json')
            .set('authorization', utils.otherUserAuth)
            .send(pkg)
            .expect(201, function (err) {
              should.not.exist(err);
              var pkg = utils.getPackage('public-remove-all-module-admin', '0.1.1', utils.admin);
              request(app)
              .put('/public-remove-all-module-admin')
              .set('content-type', 'application/json')
              .set('authorization', utils.adminAuth)
              .send(pkg)
              .expect(201, done);
            });
          });
        });

        it('should fail when user remove module without scope', function (done) {
          mm(config, 'forcePublishWithScope', true);
          request(app)
          .del('/public-remove-all-module/-rev/1')
          .set('authorization', utils.otherUserAuth)
          .expect(403, done);
        });

        it('should admin remove module without scope ok', function (done) {
          mm(config, 'forcePublishWithScope', true);
          request(app)
          .del('/public-remove-all-module-admin/-rev/1')
          .set('authorization', utils.adminAuth)
          .expect(200, done);
        });

        it('should maintainer remove ok', function (done) {
          mm(config, 'forcePublishWithScope', true);
          request(app)
          .del('/@cnpm/public-remove-all-module/-rev/1')
          .set('authorization', utils.otherUserAuth)
          .expect(200, function (err, res) {
            should.not.exist(err);
            should.not.exist(res.headers['set-cookie']);
            done();
          });
        });

        it('should admin remove ok', function (done) {
          mm(config, 'forcePublishWithScope', true);
          request(app)
          .del('/@cnpm/public-remove-all-module-admin/-rev/1')
          .set('authorization', utils.adminAuth)
          .expect(200, function (err, res) {
            should.not.exist(err);
            should.not.exist(res.headers['set-cookie']);
            done();
          });
        });
      });
    });
  });
});
