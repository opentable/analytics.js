
var debug = require('debug')('analytics:user');
var Entity = require('./entity');
var inherit = require('inherit');
var bind = require('bind');
var cookie = require('./cookie');
var uuid = require('uuid');
var rawCookie = require('cookie');
var topDomain = require('top-domain');


/**
 * User defaults
 */

User.defaults = {
  persist: true,
  cookie: {
    key: 'ajs_gpid',
    oldKey: 'ajs_user'
  },
  localStorage: {
    key: 'ajs_user_traits'
  }
};


/**
 * Initialize a new `User` with `options`.
 *
 * @param {Object} options
 */

function User (options) {
  this.defaults = User.defaults;
  this.debug = debug;
  Entity.call(this, options);
}


/**
 * Inherit `Entity`
 */

inherit(User, Entity);

/**
 * Set / get the user id.
 *
 * When the user id changes, the method will
 * reset his anonymousId to a new one.
 *
 * Example:
 *
 *      // didn't change because the user didn't have previous id.
 *      anonId = user.anonymousId();
 *      user.id('foo');
 *      assert.equal(anonId, user.anonymousId());
 *
 *      // didn't change because the user id changed to null.
 *      anonId = user.anonymousId();
 *      user.id('foo');
 *      user.id(null);
 *      assert.equal(anonId, user.anonymousId());
 *
 *     // change because the user had previous id.
 *     anonId = user.anonymousId();
 *     user.id('foo');
 *     user.id('baz'); // triggers change
 *     user.id('baz'); // no change
 *     assert.notEqual(anonId, user.anonymousId());
 *
 * @param {String} id
 * @return {Mixed}
 */

User.prototype.id = function(id){
  return this.opentable_gid();
};

/**
 * If you never seen opentable's cookies you do not know what you are missing
 * document.cookie (reduced for simplicity)
 * "otuvid=C1E655B3-FE81-4924-A44B-D5A9823DBF97; optimizelyEndUserId=oeu1446356152712r0.659611732698977; =1446356154:S=ALNI_MZLHTi5sHNq1r0SBhU_Z5iuG4uMYw; signalGroup=Criteo; __qca=P0-1223548594-1446356163894; linkedin_oauth_iw88dev33fri_crc=null; smcx_94895_last_shown_at=1446698440611; otuvid=DA5BAA73-E0D4-4C43-96A6-EF9C503DCAA8; _ga=     GA1.2.455112032.1447370588; _hp2_id.3183525499=4715800637229934.2002044125.0149643853; OT-SV-294-Enable-Points-Popup=enable; IDine=INCENTIVE; uCke=uid=uVdePM%2bmUJ7dnXmmknEHug%3d%3d&gpid=CqWk88XuuJBLQjX8JJgTBg%3d%3d&gid=180050745048&uf=False&sr=&so=0&pts=200&pn=4154818271&pnc=US&mpn=&mpnc=US&lrpt=0&ln=Delgado&c=0&fn=Pablo&em=4TdXWKYrzFU98tMKP2SQGcdq2yolO%2bs9&sfn=&sln=&m=4&ct=1&sa     l=1&l=1&dff=1&lo=4TdXWKYrzFU98tMKP2SQGcdq2yolO%2bs9&po=0&ci=0&co=&cp=&rrid=51061%2c95704%2c38932%2c15403%2c47218&drid=&xdl=False; __utma=218221895.1395918790.1446356159.1460510771.1460574244.433"
 *
 */
User.prototype.opentable_gid = function(){
  var all_cookie_keys =  document.cookie.split("; ");
  var cookie_key = this.mobileweb_or_web_key();
  var cookie_subkey = this.mobileweb_or_web_subkey();
  var len = all_cookie_keys.length;
  for (var i = 0; i < len; i++) {
    if (all_cookie_keys[i].match(cookie_key)) {
      var parts = all_cookie_keys[i].split("&");
      var len2 = parts.length;
      for (var x = 0; x < len2; x++) {
        if (parts[x].match(cookie_subkey)) {
          return parts[x].split("=")[1];
        }
      }
    }
  }

  return "0";
}

User.prototype.raw_cookie = function() {
  return document.cookie;
}

User.prototype.mobileweb_or_web_key = function() {
   var subdomain = window.location.hostname.split(".")[0] // in www.opentable.com or m.opentable.com gives www or m
   return (subdomain == "m") ? "mUcke" : "uCke";
}

User.prototype.mobileweb_or_web_subkey = function() {
   var subdomain = window.location.hostname.split(".")[0] // in www.opentable.com or m.opentable.com gives www or m
   return (subdomain == "m") ? "gpid" : "gid";
}


/**
 * Set / get / remove anonymousId.
 *
 * @param {String} anonId
 * @return {String|User}
 */

User.prototype.anonymousId = function(anonId){
  var store = this.storage();

  // set / remove
  if (arguments.length) {
    store.set('otuvid', anonId);
    return this;
  }

  // new
  if (anonId = store.get('otuvid')) {
    return anonId;
  }

  // old - it is not stringified so we use the raw cookie.
  if (anonId = rawCookie('_sio')) {
    anonId = anonId.split('----')[0];
    store.set('otuvid', anonId);
    store.remove('_sio');
    return anonId;
  }

  // empty
  anonId = uuid();
  store.set('otuvid', anonId);
  return store.get('otuvid');
};

/**
 * Remove anonymous id on logout too.
 */

User.prototype.logout = function(){
  Entity.prototype.logout.call(this);
  this.anonymousId(null);
};

/**
 * Load saved user `id` or `traits` from storage.
 */

User.prototype.load = function () {
  if (this._loadOldCookie()) return;
  Entity.prototype.load.call(this);
};


/**
 * BACKWARDS COMPATIBILITY: Load the old user from the cookie.
 *
 * @return {Boolean}
 * @api private
 */

User.prototype._loadOldCookie = function () {
  var user = cookie.get(this._options.cookie.oldKey);
  if (!user) return false;

  this.id(user.id);
  this.traits(user.traits);
  cookie.remove(this._options.cookie.oldKey);
  return true;
};


/**
 * Expose the user singleton.
 */

module.exports = bind.all(new User());


/**
 * Expose the `User` constructor.
 */

module.exports.User = User;
