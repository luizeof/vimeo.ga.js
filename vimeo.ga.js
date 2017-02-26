/*!
 * vimeo.ga.js | v0.6
 * Based on modifications by LukasBeaton (https://github.com/LukasBeaton/vimeo.ga.js)
 * Copyright (c) 2015 Sander Heilbron (http://www.sanderheilbron.nl)
 * MIT licensed
 */


var vimeoGAJS = (window.vimeoGAJS) ? window.vimeoGAJS : {};

(function($) {
  vimeoGAJS = {
    iframes : [],
    gaTracker : undefined,
    eventMarker : {},

    init: function () {
      vimeoGAJS.iframes = $('iframe');

      $.each(vimeoGAJS.iframes, function (index, iframe) {
        var iframeId = $(iframe).attr('id');

        vimeoGAJS.eventMarker[iframeId] = {
          'progress0' : false,
          'progress10' : false,
          'progress20' : false,
          'progress30' : false,
          'progress40' : false,
          'progress50' : false,
          'progress60' : false,
          'progress70' : false,
          'progress80' : false,
          'progress90' : false,
          'progress100' : false,
          'videoPlayed' : false,
          'videoPaused' : false,
          'videoResumed' : false,
          'videoSeeking' : false,
          'videoCompleted' : false,
          'timePercentComplete' : 0
        };
      });

      // Check which version of Google Analytics is used
      if (typeof ga === "function") {
        vimeoGAJS.gaTracker = 'ua'; // Universal Analytics (universal.js)
        //console.info('Universal Analytics');
      }

      if (typeof _gaq !== "undefined" && typeof _gaq.push === "function") {
        vimeoGAJS.gaTracker = 'ga'; // Classic Analytics (ga.js)
        //console.info('Classic Analytics');
      }

      if (typeof dataLayer !== "undefined" && typeof dataLayer.push === "function") {
        vimeoGAJS.gaTracker = 'gtm'; // Google Tag Manager (dataLayer)
        //console.info('Google Tag Manager');
      }

      // Listen for messages from the player
      if (window.addEventListener) {
        window.addEventListener('message', vimeoGAJS.onMessageReceived, false);
      } else {
        window.attachEvent('onmessage', vimeoGAJS.onMessageReceived, false);
      }
    },

    // Handle messages received from the player
    onMessageReceived: function(e) {
      if (e.origin.replace('https:', 'http:') !== "http://player.vimeo.com" || typeof vimeoGAJS.gaTracker === 'undefined') {
        //console.warn('Tracker is missing!');
        return;
      }

      var data = JSON.parse(e.data),
          iframeEl = $("#"+data.player_id),
          iframeId = iframeEl.attr('id');

      switch (data.event) {
      case 'ready':
        vimeoGAJS.onReady();
        break;

      case 'playProgress':
        vimeoGAJS.onPlayProgress(data.data, iframeEl);
        break;

      case 'seek':
        if (iframeEl.data('seek') && !vimeoGAJS.eventMarker[iframeId].videoSeeking) {
          vimeoGAJS.sendEvent(iframeEl, 'Skipped video forward or backward');
          vimeoGAJS.eventMarker[iframeId].videoSeeking = true; // Avoid subsequent seek trackings
        }
        break;

      case 'play':
        if (!vimeoGAJS.eventMarker[iframeId].videoPlayed) {
          vimeoGAJS.sendEvent(iframeEl, 'Started video');
          vimeoGAJS.eventMarker[iframeId].videoPlayed = true; // Avoid subsequent play trackings
        } else if (!vimeoGAJS.eventMarker[iframeId].videoResumed && vimeoGAJS.eventMarker[iframeId].videoPaused) {
          vimeoGAJS.sendEvent(iframeEl, 'Resumed video');
          vimeoGAJS.eventMarker[iframeId].videoResumed = true; // Avoid subsequent resume trackings
        }
        break;

      case 'pause':
        vimeoGAJS.onPause(iframeEl);
        break;

      case 'finish':
        if (!vimeoGAJS.eventMarker[iframeId].videoCompleted) {
          vimeoGAJS.sendEvent(iframeEl, 'Completed video');
          vimeoGAJS.eventMarker[iframeId].videoCompleted = true; // Avoid subsequent finish trackings
        }
        break;
      }
    },

    getLabel : function(iframeEl) {
      var iframeSrc = iframeEl.attr('src').split('?')[0];
      var label = iframeSrc;
      if (iframeEl.data('title')) {
        label += ' (' + iframeEl.data('title') + ')';
      } else if (iframeEl.attr('title')) {
        label += ' (' + iframeEl.attr('title') + ')';
      }
      return label;
    },

    // Helper function for sending a message to the player
    post : function (action, value, iframe) {
      var data = {
        method: action
      };

      if (value) {
        data.value = value;
      }

      // Source URL
      var iframeSrc = $(iframe).attr('src').split('?')[0];

      iframe.contentWindow.postMessage(JSON.stringify(data), iframeSrc);
    },

    onReady :function() {
      $.each(vimeoGAJS.iframes, function(index, iframe) {
        vimeoGAJS.post('addEventListener', 'play', iframe);
        vimeoGAJS.post('addEventListener', 'seek', iframe);
        vimeoGAJS.post('addEventListener', 'pause', iframe);
        vimeoGAJS.post('addEventListener', 'finish', iframe);
        vimeoGAJS.post('addEventListener', 'playProgress', iframe);
      });
    },

    onPause: function(iframeEl) {
      var iframeId = iframeEl.attr('id');
      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete < 99 && !vimeoGAJS.eventMarker[iframeId].videoPaused) {
        vimeoGAJS.sendEvent(iframeEl, 'Paused video');
        vimeoGAJS.eventMarker[iframeId].videoPaused = true; // Avoid subsequent pause trackings
      }
    },

    // Tracking video progress
    onPlayProgress: function(data, iframeEl) {
      var progress,
          iframeId = iframeEl.attr('id');
      vimeoGAJS.eventMarker[iframeId].timePercentComplete = Math.round((data.percent) * 100); // Round to a whole number

      if (!iframeEl.data('progress')) {
        return;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete >= 0 && !vimeoGAJS.eventMarker[iframeId].progress0) {
        progress = 'Played video: 0%';
        vimeoGAJS.eventMarker[iframeId].progress0 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete > 10 && !vimeoGAJS.eventMarker[iframeId].progress10) {
        progress = 'Played video: 10%';
        vimeoGAJS.eventMarker[iframeId].progress10 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete > 20 && !vimeoGAJS.eventMarker[iframeId].progress20) {
        progress = 'Played video: 20%';
        vimeoGAJS.eventMarker[iframeId].progress20 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete > 30 && !vimeoGAJS.eventMarker[iframeId].progress30) {
        progress = 'Played video: 30%';
        vimeoGAJS.eventMarker[iframeId].progress30 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete > 40 && !vimeoGAJS.eventMarker[iframeId].progress40) {
        progress = 'Played video: 40%';
        vimeoGAJS.eventMarker[iframeId].progress40 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete > 50 && !vimeoGAJS.eventMarker[iframeId].progress50) {
        progress = 'Played video: 50%';
        vimeoGAJS.eventMarker[iframeId].progress50 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete > 60 && !vimeoGAJS.eventMarker[iframeId].progress60) {
        progress = 'Played video: 60%';
        vimeoGAJS.eventMarker[iframeId].progress60 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete > 70 && !vimeoGAJS.eventMarker[iframeId].progress70) {
        progress = 'Played video: 70%';
        vimeoGAJS.eventMarker[iframeId].progress70 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete > 80 && !vimeoGAJS.eventMarker[iframeId].progress80) {
        progress = 'Played video: 80%';
        vimeoGAJS.eventMarker[iframeId].progress80 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete > 90 && !vimeoGAJS.eventMarker[iframeId].progress90) {
        progress = 'Played video: 90%';
        vimeoGAJS.eventMarker[iframeId].progress90 = true;
      }

      if (vimeoGAJS.eventMarker[iframeId].timePercentComplete >= 99 && !vimeoGAJS.eventMarker[iframeId].progress100) {
        progress = 'Played video: 100%';
        vimeoGAJS.eventMarker[iframeId].progress100 = true;
      }

      if (progress) {
        vimeoGAJS.sendEvent(iframeEl, progress);
      }
    },

    // Send event to Classic Analytics, Universal Analytics or Google Tag Manager
    sendEvent: function (iframeEl, action) {
      var bounce = iframeEl.data('bounce');
      var label = vimeoGAJS.getLabel(iframeEl);

      switch (vimeoGAJS.gaTracker) {
      case 'gtm':
        dataLayer.push({'event': 'Vimeo', 'eventCategory': 'Vimeo', 'eventAction': action, 'eventLabel': label, 'eventValue': undefined, 'eventNonInteraction': (bounce) ? false : true });
        break;

      case 'ua':
        ga('send', 'event', 'Vimeo', action, label, undefined, {'nonInteraction': (bounce) ? 0 : 1});
        break;

      case 'ga':
        _gaq.push(['_trackEvent', 'Vimeo', action, label, undefined, (bounce) ? false : true]);
        break;
      }
    }
  };

  vimeoGAJS.init();
})(jQuery);
