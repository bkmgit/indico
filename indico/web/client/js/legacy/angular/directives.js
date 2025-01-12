// This file is part of Indico.
// Copyright (C) 2002 - 2022 CERN
//
// Indico is free software; you can redistribute it and/or
// modify it under the terms of the MIT License; see the
// LICENSE file for more details.

var ndDirectives = angular.module('ndDirectives', []);

ndDirectives.directive('ndDialog', function($http, $compile, $timeout) {
  return {
    restrict: 'E',
    scope: {
      show: '=',
      heading: '@',
      okButton: '@',
      okCallback: '&',
      okOnly: '=',
      cancelButton: '@',
      cancelCallback: '&',
      validate: '=',
      api: '=',
      data: '=',
      config: '=',
    },

    controller: function($scope) {
      $scope.actions = {
        init: function() {},
        cleanup: function() {},
        close: function() {
          $scope.$apply(($scope.validationStarted = false));
          $scope.actions.cleanup();
          $scope.show = false;
          $scope.$apply($scope.show);
        },
        cancel: function() {
          $scope.cancelCallback({dialogScope: $scope});
          $scope.actions.close();
        },
        ok: function() {
          $scope.$apply(($scope.validationStarted = true));
          var resultOkCallback = $scope.okCallback({dialogScope: $scope});
          if (($scope.validate === true && resultOkCallback === true) || $scope.validate !== true) {
            $scope.actions.close();
          }
        },
      };
    },

    link: function(scope, element) {
      var dialog;

      var initDialog = function() {
        dialog = new ExclusivePopupWithButtons(
          scope.heading,
          scope.actions.cancel,
          false,
          false,
          true
        );

        dialog._onClose = function() {};

        dialog._getButtons = function() {
          var buttons = [];
          var ok = scope.okButton || $T('Ok');
          var cancel = scope.cancelButton || $T('Cancel');

          buttons.push([
            ok,
            function() {
              scope.actions.ok();
            },
          ]);

          if (!scope.okOnly) {
            buttons.push([
              cancel,
              function() {
                scope.actions.cancel();
              },
            ]);
          }

          return buttons;
        };

        dialog.draw = function() {
          return this.ExclusivePopupWithButtons.prototype.draw.call(this, element);
        };

        dialog.postDraw = function() {
          this.canvas.dialog('option', 'draggable', false);
          this.canvas.dialog('option', 'position', 'center');
        };
      };

      var openDialog = function() {
        if (dialog) {
          showDialog();
        } else {
          $http
            .get(scope.templateUrl, {})
            .success(function(response, status, header, config) {
              element = angular.element(response);
              $compile(element)(scope);
              $timeout(function() {
                initDialog();
                showDialog();
              }, 0);
            })
            .error(function(data, status, header, config) {
              scope.show = false;
              var msg = $T('The content of this dialog is currently unavailable.');
              new AlertPopup(scope.heading, msg).open();
            });
        }
      };

      var showDialog = function() {
        scope.actions.init();
        dialog.open();
      };

      scope.setSelectedTab = function(tab_id) {
        scope.tabSelected = tab_id;
      };

      scope.isTabSelected = function(tab_id) {
        return scope.tabSelected === tab_id;
      };

      scope.getDefaultFieldSetting = function(setting) {
        return scope.$parent.getDefaultFieldSetting(setting);
      };

      scope.$watch('show', function(val) {
        if (scope.show === true) {
          openDialog();
        } else if (dialog) {
          dialog.close();
        }
      });
    },
  };
});

ndDirectives.directive('contenteditable', function() {
  return {
    require: 'ngModel',
    restrict: 'A',
    link: function(scope, elem, attrs, ctrl) {
      scope.edition = false;
      scope.multiline = scope.$eval(attrs.ndMultiline) || false;

      var sanitizeHtml = function() {
        var sanitized = elem.html();
        // Chrome sanitization
        sanitized = sanitized
          .replace(/<div><br><\/div>/g, '<div></div>')
          .replace(/<div[^<]*?>/g, '\n')
          .replace(/<\/div[^<]*?>/g, '');

        // FF sanitization
        sanitized = sanitized.replace(/<br>/g, '\n');

        // IE sanitization
        sanitized = sanitized
          .replace(/<p>&nbsp;<\/p>/g, '<p></p>')
          .replace(/<p[^<]*?>/g, '\n')
          .replace(/<\/p[^<]*?>/g, '');

        // Trimming
        sanitized = sanitized
          .replace(/&nbsp;/g, ' ')
          .replace(/^(( )*(<br>))*/, '')
          .replace(/(( )*(<br>)( )*)*$/, '');

        elem.text(_.unescape(sanitized));
      };

      var updateHtml = function() {
        if (ctrl.$viewValue === '') {
          elem.html(attrs.placeholder);
          elem.addClass('empty');
        } else {
          elem.text(_.unescape(ctrl.$viewValue));
        }
      };

      var getOneLineHeight = function() {
        var html = elem.html();
        var height = elem.html('.').css('height');
        elem.html(html);
        return height;
      };

      var actions = {
        init: function() {
          elem.actioninput('initSize', elem.css('font-size'), getOneLineHeight());
          elem.actioninput('setIconsVisibility', 'visible');
          elem.actioninput('setEmptyValue', elem.html());
          elem.addClass('focus');
          elem.removeClass('empty');

          if (ctrl.$viewValue === '' && !scope.edition) {
            elem.html('');
          }

          if (!scope.edition) {
            elem.text(elem.text());
          }

          scope.edition = true;
        },
        close: function() {
          elem.removeClass('focus');
          elem.actioninput('setIconsVisibility', 'hidden');
          scope.edition = false;
          updateHtml();
        },
      };

      // model -> view
      ctrl.$render = function() {
        updateHtml();
      };

      // creation
      elem.actioninput({
        focusOnClear: false,
        enterKeyEnabled: !scope.multiline,

        // view -> model
        actionCallback: function() {
          sanitizeHtml();
          scope.$apply(function() {
            ctrl.$setViewValue(_.unescape(elem.html()));
          });
          actions.close();
        },

        // view -> model
        onClear: function() {
          actions.close();
        },

        // angular -> jquery
        onInput: function() {
          elem.val(elem.html());
        },
      });

      // input init
      elem.on('focus', function() {
        actions.init();
      });

      elem.actioninput('setIconsVisibility', 'hidden');
    },
  };
});

ndDirectives.directive('ndConfirmationPopup', function() {
  return {
    restrict: 'E',
    scope: {
      heading: '@',
      content: '@',
      callback: '=',
      show: '=',
    },

    link: function(scope) {
      var open = function() {
        var popup = new ConfirmPopup(scope.heading, scope.content, scope.callback, null, null, {
          'max-width': '300px',
        });
        popup.open();
      };

      scope.$watch('show', function() {
        if (scope.show === true) {
          scope.show = false;
          open();
        }
      });
    },
  };
});

ndDirectives.directive('ndValidFile', function() {
  return {
    require: 'ngModel',
    link: function(scope, el, attrs, ngModel) {
      ngModel.$render = function() {
        ngModel.$setViewValue(el.val());
      };

      el.bind('change', function() {
        scope.$apply(function() {
          ngModel.$render();
        });
      });
    },
  };
});

ndDirectives.directive('ndRadioExtend', function($rootScope) {
  return {
    require: 'ngModel',
    restrict: 'A',
    link: function(scope, element) {
      element.bind('click', function() {
        $rootScope.$$phase || $rootScope.$apply();
      });
    },
  };
});

ndDirectives.directive('ndBlacklist', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      var blacklist = attrs.ndBlacklist.split(',');

      // DOM -> Model validation
      ngModel.$parsers.unshift(function(value) {
        var valid = blacklist.indexOf(value) === -1;
        ngModel.$setValidity('blacklist', valid);
        return valid ? value : undefined;
      });

      // model -> DOM validation
      ngModel.$formatters.unshift(function(value) {
        ngModel.$setValidity('blacklist', blacklist.indexOf(value) === -1);
        return value;
      });
    },
  };
});

ndDirectives.directive('ndInitFocus', function() {
  var timer;

  return function(scope, element, attrs) {
    if (timer) clearTimeout(timer);

    timer = setTimeout(function() {
      element.focus();
    }, 0);
  };
});

function translateDateFormat(fmt) {
  return fmt.split(' ')[0].replace(/%([dmY])/g, function(match, c) {
    return {d: 'dd', m: 'mm', Y: 'yy'}[c];
  });
}

ndDirectives.directive('ndJqueryDatepicker', function() {
  return {
    require: 'ngModel',
    restrict: 'A',
    link: function(scope, element, attrs, ctrl) {
      _.defer(function() {
        scope.$watch('field.dateFormat', function() {
          var fmt = translateDateFormat(
            scope.field.dateFormat || scope.getDefaultFieldSetting('defaultDateFormat')
          );
          element.datepicker('option', 'dateFormat', fmt);

          // if new format has no time, set it to null in the model
          if (scope.field.dateFormat && scope.field.dateFormat.indexOf(' ') == -1) {
            scope.dateTime.time = null;
          } else if (scope.dateTime && scope.dateTime.time === null) {
            scope.dateTime.time = '';
          }
        });

        var dateFormat =
          scope.field.dateFormat || scope.getDefaultFieldSetting('defaultDateFormat');
        element.datepicker({
          dateFormat: translateDateFormat(dateFormat),
          onSelect: function(date) {
            ctrl.$setViewValue(date);
            $(this).change();
            scope.$apply();
          },
        });

        element.on('change', function(event) {
          var dateValue = $(event.target).val();
          if (scope.field.isRequired || dateValue) {
            var momentJsFormat = translateDateFormat(dateFormat)
              .replace('yy', 'yyyy')
              .toUpperCase();
            ctrl.$setValidity('date', new moment(dateValue, momentJsFormat, true).isValid());
          }
        });
      });
    },
  };
});
