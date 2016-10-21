angular.module('angular-jwt.authManager', [])
  .provider('authManager', function () {

    this.$get = function ($rootScope, $injector, $location, jwtHelper, jwtInterceptor, jwtOptions) {

      var config = jwtOptions.getConfig();

      function invokeToken(tokenGetter) {
        var token = null;
        if (Array.isArray(tokenGetter)) {
          token = $injector.invoke(tokenGetter, this, {options: null});
        } else {
          token = tokenGetter();
        }
        return token;
      }

      function invokeRedirector(redirector) {
        if (Array.isArray(redirector) || angular.isFunction(redirector)) {
          return $injector.invoke(redirector, config, {});
        } else {
          throw new Error('unauthenticatedRedirector must be a function');
        }
      }

      $rootScope.isAuthenticated = false;

      function authenticate() {
        $rootScope.isAuthenticated = true;
      }

      function unauthenticate() {
        $rootScope.isAuthenticated = false;
      }

      function checkAuthOnRefresh() {
        $rootScope.$on('$locationChangeStart', function () {
          var token = invokeToken(config.tokenGetter);
          if (token) {
            if (!jwtHelper.isTokenExpired(token)) {
              authenticate();
            } else {
              $rootScope.$broadcast('tokenHasExpired', token);
            }
          }
        });
      }

      function redirectWhenUnauthenticated() {
        $rootScope.$on('unauthenticated', function () {
          invokeRedirector(config.unauthenticatedRedirector);
          unauthenticate();
        });
      }

      function verifyRoute(event, next) {
        if (!next) {
          return false;
        }

        var routeData = (next.$$route) ? next.$$route : next.data;

        if (routeData && routeData.requiresLogin === true) {
          var token = invokeToken(config.tokenGetter);
          if (!token || jwtHelper.isTokenExpired(token)) {
            invokeRedirector(config.unauthenticatedRedirector);
            event.preventDefault();
          }
        }
      }

      var eventName = ($injector.has('$state')) ? '$stateChangeStart' : '$routeChangeStart';
      $rootScope.$on(eventName, verifyRoute);

      return {
        authenticate: authenticate,
        unauthenticate: unauthenticate,
        getToken: function(){ return invokeToken(config.tokenGetter); },
        redirect: function() { return invokeRedirector(config.unauthenticatedRedirector); },
        checkAuthOnRefresh: checkAuthOnRefresh,
        redirectWhenUnauthenticated: redirectWhenUnauthenticated
      }
    }
  });
