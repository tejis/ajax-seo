/*global define, module, window, document, history, location, ga, setTimeout, clearTimeout, XMLHttpRequest*/

(function (factory) {
    "use strict";

    // ES6 UMD (Universal Module Definition) http://jsrocks.org/2014/07/a-new-syntax-for-modules-in-es6/
    if (typeof define === "function" && define.amd) {
        // AMD
        define(["as"], factory);
    } else if (typeof module === "object" && module.exports) {
        // Node.js, CommonJS
        module.exports = factory();
    } else {
        // Browser globals
        window.as = factory();
    }
}(function () {
    "use strict";

    // cached
    var w = window,
        d = document,
        h = history,
        l = location,
        has = {
            // classList supported since IE10
            classList: "classList" in d.documentElement,
            // DOM 2 spec: element.click() defined only for HTMLInputElement http://www.w3.org/TR/DOM-Level-2-HTML/ecma-script-binding.html
            click: "click" in d.documentElement,
            // addEventListener supported since IE9
            eventListener: !!d.addEventListener,
            // Touch events supported since Edge
            // https://code.google.com/p/chromium/issues/detail?id=152149, Firefox 27+ https://bugzilla.mozilla.org/show_bug.cgi?id=970346 (only if earlier used Developer Tools > Responsive mode)
            touch: "ontouchstart" in w,
            valid: function (fn) {
                // V8 optimized try-catch http://stackoverflow.com/questions/19727905/in-javascript-is-it-expensive-to-use-try-catch-blocks-even-if-an-exception-is-n
                try {
                    return fn();
                } catch (e) {
                    has.valid.error.e = e;
                    return has.valid.error;
                }
            }
        },
        layout = {
            // Expandable navigation
            bar: d.getElementById("bar"),
            focusin: d.getElementById("focusin"),
            focusout: d.getElementById("focusout"),
            reset: d.getElementById("reset"),

            // Top navigation and content
            nav: d.getElementById("nav"),
            status: d.getElementById("status"),
            output: d.getElementById("output")
        },
        nav = {
            toggleClass: function (el, className) {
                if (el) {
                    if (has.classList) {
                        // IE11 doesn't support multiple classes https://connect.microsoft.com/IE/Feedback/Details/920755
                        el.classList.toggle(className);
                    } else {
                        var classes = el.className.split(" "),
                            existingIndex = classes.indexOf(className);

                        if (existingIndex >= 0) {
                            classes.splice(existingIndex, 1);
                        } else {
                            classes.push(className);
                        }

                        el.className = classes.join(" ");
                    }
                }
            },
            toToggle: function (toExpand) {
                // Perf http://jsperf.com/document-body-parentelement
                this.toggleClass(d.body.parentElement, "noscroll");
                this.toggleClass(layout.status, "expand");

                if (toExpand && layout.focusin) {
                    setTimeout(function () {
                        // Fix twice fired focus on Firefox
                        layout.focusin.focus();
                    }, 0);
                }
            },
            toFocus: function () {
                if (d.activeElement !== layout.focusin) {
                    // Old Webkit fix
                    this.toToggle(true);
                }
            }
        },
        as = {
            // Number
            version: 4.7,

            // String "UA-XXXX-Y"
            analytics: undefined,

            // String
            origin: (function () {
                var currentScript = d.currentScript || (function () {
                        var script = d.getElementsByTagName("script");
                        return script[script.length - 1];
                    }()),
                    origin = currentScript.src.split("#")[1] || "/ajax-seo";

                if (origin === "/") {
                    return location.origin;
                } else {
                    return d.URL.replace(new RegExp("(" + origin + ")(.*)$"), "$1");
                }
            }()),

            // String http://jsperf.com/document-url-vs-window-location-href/2
            url: d.URL,

            // String
            title: d.title,

            // Element or null
            activeElement: (function () {
                var arr = d.querySelectorAll ? d.querySelectorAll("[href]") : [],
                    i;

                for (i = 0; i < arr.length; i += 1) {
                    if (arr[i].href.toUpperCase() === d.URL.toUpperCase()) {
                        // Normalize strings to uppercase https://msdn.microsoft.com/en-us/library/bb386042.aspx
                        return arr[i];
                    }
                }

                return null;
            }()),

            // Boolean
            error: layout.status && (has.classList ? layout.status.classList.contains("status-error") : new RegExp("(^|\\s)status-error(\\s|$)").test(layout.status.className))
        },
        statusLanded,
        statusTimer,
        client,
        root;

    has.valid.error = {
        e: null
    };

    if (as.analytics) {
        // Google Analytics, run also on legacy browsers
        w.ga = function () {
            ga.q = ga.q || [];
            ga.q.push(arguments);
        };

        ga("create", as.analytics, "auto");
        ga("send", "pageview");
    }

    if (layout.bar && has.eventListener) {
        // addEventListener and CSS media query supported since IE9

        nav.toToggle.true = function () {
            nav.toToggle(true);
        };
        nav.toToggle.false = function () {
            nav.toToggle(false);
        };
        nav.toFocus.run = function () {
            nav.toFocus();
        };
        nav.run = function () {
            if (d.documentElement.offsetWidth <= 540) {
                layout.bar.addEventListener("focus", nav.toToggle.true, true);
                layout.bar.addEventListener("click", nav.toFocus.run, true);

                if (layout.nav) {
                    layout.nav.addEventListener("click", nav.toToggle.true, true);
                }
                if (layout.focusout) {
                    layout.focusout.addEventListener("focus", nav.toToggle.false, true);
                }
                if (layout.reset) {
                    layout.reset.addEventListener("click", nav.toToggle.true, true);
                }
            } else {
                layout.bar.removeEventListener("focus", nav.toToggle.true, true);
                layout.bar.removeEventListener("click", nav.toFocus.run, true);

                if (layout.nav) {
                    layout.nav.removeEventListener("click", nav.toToggle.true, true);
                }
                if (layout.focusout) {
                    layout.focusout.removeEventListener("focus", nav.toToggle.false, true);
                }
                if (layout.reset) {
                    layout.reset.removeEventListener("click", nav.toToggle.true, true);
                }
            }
        };

        nav.run();
        w.addEventListener("resize", function () {
            if (nav.timeoutScale) {
                clearTimeout(nav.timeoutScale);
            }

            // Improve performance
            nav.timeoutScale = setTimeout(nav.run, 100);
        }, true);
    }

    if (!h.pushState || !has.classList || !has.eventListener) {
        // Stop here IE10 and Android 4.3 http://caniuse.com/#feat=history
        // Browser legacy, stop here if does not support History API
        throw new Error("Browser legacy: History API not supported");
    }

    if (!layout.output) {
        throw new Error("Layout issue: missing elements");
    }

    root = {
        filter: function (srt, noLowerCase) {
            // Remove hash from URL http://jsperf.com/url-replace-vs-match/2
            if (srt) {
                srt = srt.replace(/#.*$/, "");
                return noLowerCase ? srt : srt.toLowerCase();
            } else {
                return undefined;
            }
        },
        reset: function () {
            if (statusTimer) {
                clearTimeout(statusTimer);
            }
            if (layout.status && layout.status.classList.contains("status-start")) {
                layout.status.classList.add("status-done");
            }
        },
        click: function (el) {
            if (el) {
                if (has.click) {
                    el.click();
                } else {
                    // Old Webkit legacy
                    var evt;
                    evt = d.createEvent("MouseEvents");

                    evt.initEvent("click", true, true);
                    el.dispatchEvent(evt);
                }
            }
        },
        nav: {
            // Array
            // Convert NodeList to Array http://jsperf.com/convert-nodelist-to-array http://toddmotto.com/a-comprehensive-dive-into-nodelists-arrays-converting-nodelists-and-understanding-the-dom/
            nodeList: layout.nav ? (Array.from ? Array.from(layout.nav.querySelectorAll("a")) : [].slice.call(layout.nav.querySelectorAll("a"))) : null,
            // Element or null
            activeElement: function() {
                if (root.nav.nodeList) {
                    var i;

                    // Loop performance https://www.youtube.com/watch?v=taaEzHI9xyY#t=3042 http://www.impressivewebs.com/javascript-for-loop/ http://jsperf.com/array-length-vs-cached/19
                    for (i = 0; i < root.nav.nodeList.length; i += 1) {
                        if (root.filter(root.nav.nodeList[i].href) === as.url) {
                            return root.nav.nodeList[i];
                        }
                    }
                }

                return null;
            }
        },
        update: function (data, track, activeElement) {
            if (data) {
                if (as.analytics) {
                    // Google Universal Analytics tracking
                    ga("send", "pageview", {page: as.url});
                }

                if (!track) {
                    client.abort();
                } else {
                    root.reset();
                }

                if (root.nav.nodeList) {
                    layout.focus = layout.nav.querySelector(".focus");
                    layout.active = layout.nav.querySelector(".active");
                    layout.error = layout.nav.querySelector(".error");

                    if (layout.focus) {
                        layout.focus.classList.remove("focus");
                    }
                    if (layout.active) {
                        layout.active.classList.remove("active");
                    }
                    if (layout.error) {
                        layout.error.classList.remove("error");
                    }
                }

                if (d.activeElement && d.activeElement.tagName === "BODY") {
                    // Browser cached focus bug workaround - leaves menu focused onclick /history and navigating history back http://tjvantoll.com/2013/08/30/bugs-with-document-activeelement-in-internet-explorer/
                    d.activeElement.blur();
                }

                as.url = root.filter(d.URL);
                as.activeElement = activeElement || root.nav.activeElement();

                if (as.activeElement) {
                    as.activeElement.focus();
                    as.activeElement.classList.add(as.error ? "error" : "active");

                    if (as.error) {
                        as.activeElement.classList.add("x-error");
                    }
                }

                if (as.error) {
                    layout.status.classList.add("error");
                    layout.status.classList.add("status-error");
                } else {
                    layout.status.classList.remove("error");
                    layout.status.classList.remove("status-error");
                }

                d.title = as.title = data.title;

                // Fixing scrollTop with Document.scrollingElement https://dev.opera.com/articles/fixing-the-scrolltop-bug/ http://dev.w3.org/csswg/cssom-view/#dom-document-scrollingelement
                var scrollingElement = d.scrollingElement || d.documentElement.scrollTop || d.body;
                scrollingElement.scrollTop = 0;

                layout.output.innerHTML = data.content;

                if (l.hash) {
                    // CSS :target fix
                    // h.replaceState({
                    //     error: as.error,
                    //     title: as.title,
                    //     content: layout.output.innerHTML
                    // }, as.title, null);

                    l.replace(as.url + l.hash);
                }
            }
        },
        retry: false,
        popstate: function (e) {
            if (!(l.hash && root.filter(as.url) === root.filter(d.URL) || as.url && as.url.indexOf("#") > -1)) {
                var state = e.state,
                    activeElement;

                root.reset();

                root.retry = !state;
                as.error = state && state.error || false;

                if (!state) {
                    // retry
                    as.url = root.filter(d.URL);
                    activeElement = root.nav.activeElement();

                    root.click(activeElement);
                }

                d.activeElement.blur();

                // Chrome bug: XMLHttpRequest error avoids first popstate cache and recreates XMLHttpRequest (perhaps https://code.google.com/p/chromium/issues/detail?id=371549 will fix it)
                // 1. Fire XMLHttpRequest by clicking on different links till some of links returns an error
                // 2. Navigate history back - Chrome will recreate XMLHttpRequest for the first h.go -1. History -2, -3, etc. will return from cache accurately. Firefox correctly returns all from cache.
                root.update(state, false, activeElement);
            }
        },
        loadstart: function () {
            if (layout.status) {
                layout.status.classList.remove("status-done");
                layout.status.classList.remove("status-start");

                if (statusTimer) {
                    clearTimeout(statusTimer);
                }

                statusTimer = setTimeout(function () {
                    // Will be avoided if content already in cache
                    layout.status.classList.add("status-start");
                }, 0);
            }
        },
        callback: function (data) {
            as.error = data.error || false;

            h.replaceState(data, data.title, null);
            root.update(data, true);
        },
        load: function () {
            var response = this.response;
            response = has.valid(function () {
                return JSON.parse(response);
            });

            if (statusLanded) {
                clearTimeout(statusLanded);
            }

            root.callback(response === has.valid.error ? {
                error: true,
                title: "Server error",
                content: "<h1>Whoops...</h1><p>Experienced server error. Try to <a class=x-error href=" + as.url + ">reload</a>" + (as.url === as.origin ? "" : " or head to <a href=" + as.origin + ">home page</a>") + "."
            } : response);
        },
        closest: function (el, selector) {
            if (!el || !selector) {
                return null;
            } else if (el.closest) {
                // http://jsperf.com/native-vs-jquery-closest/3
                // Native element.closest(selectors) standard https://dom.spec.whatwg.org/#dom-element-closest and https://developer.mozilla.org/en-US/docs/Web/API/Element.closest similar to $(selector).closest(selector), supported on Chrome 40 http://blog.chromium.org/2014/12/chrome-40-beta-powerful-offline-and.html
                return el.closest(selector);
            }

            var matches = el.matches || el.webkitMatchesSelector || el.msMatchesSelector;

            while (el && el.nodeType === 1) {
                if (matches.call(el, selector)) {
                    return el;
                } else {
                    el = el.parentNode;
                }
            }

            return null;
        },
        resetStatus: function (e) {
            if (layout.status) {
                if (layout.status.classList.contains("status-error") && (!e || !as.error)) {
                    layout.status.classList.remove("status-error");
                }
                if (layout.status.classList.contains("status-done")) {
                    layout.status.classList.remove("status-start");
                    layout.status.classList.remove("status-done");
                }
            }
        },
        listener: function (e) {
            if (e) {
                var el = e.target,
                    patt = new RegExp("^" + as.origin + "($|#|/.{1,}).*", "i"),
                    url = {};

                // Run script only if has a link and matches "as.origin"
                if (!el) {
                    return;
                } else if (el.tagName !== "A") {
                    el = root.closest(el, "a[href]");
                }
                if (!el || !(el.tagName === "A" && el.hasAttribute("href")) || !patt.test(el.href.replace(/\/$/, ""))) {
                    // Stop: outside API scope
                    return;
                }

                // Lowercase URL
                // Remove multiple trailing slashes except to protocol
                // Remove trailing slash from URL end
                as.url = el.href.toLowerCase().replace(/(\/)+(?=\1)/g, "").replace(/(^https?:(\/))/, "$1/").replace(/\/$/, "");
                url.attr = root.filter(as.url, true);
                url.address = root.filter(d.URL);

                if (url.attr === url.address && as.url.indexOf("#") > -1) {
                    // stop: same link with hash
                    return;
                }

                e.preventDefault();
                el.blur();

                as.activeElement = el;
                as.activeNav = el.parentNode === layout.nav;

                if (!root.retry && as.activeNav) {
                    as.error = as.activeElement.classList.contains("x-error");
                }

                // innerText is not standardised and not either supported on Firefox
                // http://www.kellegous.com/j/2013/02/27/innertext-vs-textcontent/
                // http://stackoverflow.com/questions/1359469/innertext-works-in-ie-but-not-in-firefox
                // http://jsperf.com/textcontent-and-innertext/3
                as.title = as.activeElement.innerText ? as.activeElement.innerText.replace(/\n/, "") : as.activeElement.textContent;

                if (as.error && url.address === d.URL) {
                    h.replaceState(null, as.title, as.url);
                } else if (!as.error && as.url !== d.URL) {
                    h.pushState(null, as.title, as.url);
                }

                if (!as.error && !root.retry && (url.attr === url.address) || as.activeNav && as.activeElement.classList.contains("focus")) {
                    // Avoid API retry on same link if has not error status
                    return;
                }

                if (statusLanded) {
                    clearTimeout(statusLanded);
                }

                statusLanded = setTimeout(function () {
                    d.title = as.title;
                }, 3);

                root.resetStatus();

                if (root.nav.nodeList) {
                    if (as.error && as.activeNav) {
                        as.activeElement.classList.remove("x-error");
                        as.activeElement.classList.remove("error");
                    }

                    layout.focus = layout.nav.querySelector(".focus");

                    if (layout.focus) {
                        layout.focus.classList.remove("focus");
                    }
                }
                if (as.activeNav) {
                    as.activeElement.classList.add("focus");
                }

                // IE11 issue: client.send() new request doesn't cancel unfinished earlier request
                client.abort();

                client.open("GET", as.origin + "/api" + url.attr.replace(new RegExp("^" + as.origin, "i"), ""));

                if (as.error) {
                    // Avoid cache http://stackoverflow.com/questions/1046966/whats-the-difference-between-cache-control-max-age-0-and-no-cache
                    // Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=706806 https://bugzilla.mozilla.org/show_bug.cgi?id=428916 https://bugzilla.mozilla.org/show_bug.cgi?id=443098
                    // client.setRequestHeader("Cache-Control", "no-cache");
                    client.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2000 00:00:00 GMT");
                }

                client.send();
            }
        },
        init: function () {
            if (layout.status) {
                // Loading status reset
                layout.status.addEventListener("transitionend", root.resetStatus, true);
            }

            setTimeout(function () {
                // Old Webkit initial run popstate bug https://code.google.com/p/chromium/issues/detail?id=63040, fixed on Chrome 34
                // Chrome popstate bug with hashchange: multiple clicks on same hash URL will save lots of history
                // Chrome repeatedly repeated same hash URL history/popstate by onclick on same URL https://code.google.com/p/chromium/issues/detail?id=371549 http://jsbin.com/371549/1
                // http://jsperf.com/onpopstate-vs-addeventlistener
                w.onpopstate = root.popstate;
            }, 150);

            // Initial popstate state
            h.replaceState({
                error: as.error,
                title: as.title,
                content: layout.output.innerHTML
            }, as.title, as.url);

            // XMLHttpRequest https://xhr.spec.whatwg.org/
            client = new XMLHttpRequest();
            // // IE11: SCRIPT5022: SyntaxError
            // client.open("GET", null);
            // // IE11: SCRIPT5022: InvalidStateError https://connect.microsoft.com/IE/feedback/details/794808
            // client.responseType = "json";
            // // would loop 4 times
            // client.addEventListener("readystatechange", root.callback, true);
            client.addEventListener("loadstart", root.loadstart, true);
            client.addEventListener("load", root.load, true);
            client.addEventListener("abort", root.reset, true);

            // http://jsperf.com/addeventlistener-usecapture-true-vs-false
            d.documentElement.addEventListener(has.touch ? "touchstart" : "click", root.listener, true);
        }
    };

    if (!as.analytics) {
        delete as.analytics;
    }

    // Apply events
    root.init();

    // Return readable API
    return as;
}));
