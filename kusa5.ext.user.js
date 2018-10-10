// ==UserScript==
// @name         Kusa5.ext
// @namespace    net.ghippos.ext.kusa5
// @version      0.9
// @description  Next generation of kusa5.mod.user.js. Based on the original HTML5 player by Niconico.
// @author       mohemohe
// @match        *.nicovideo.jp/watch/*
// @grant        none
// ==/UserScript==

const BaseCss = String.raw`
.SeekBarContainer,
.ControllerContainer {
    display: none !important;
}
`.trim();

class Fucker {
    constructor() {
        this.bodyMutationObserver = new MutationObserver(() => this.onUpdateDOM());
        this.targetMutationObserver = new MutationObserver(() => this.hook());
        this.targetMutationObserverStarted = false;
    }

    start() {
        this.bodyMutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    onUpdateDOM() {
        const target = document.querySelector('.MainContainer');
        if (target && !this.targetMutationObserverStarted) {
            this.targetMutationObserverStarted = true;
            this.targetMutationObserver.observe(this.getBodyChildElement(target), {
                childList: true,
                subtree: true,
            });
        } else if (!target && this.targetMutationObserverStarted) {
            this.targetMutationObserver.disconnect();
            this.targetMutationObserverStarted = false;
        }
    }

    hook() {
        const target = document.querySelector('.ControllerContainer');
        if (!target) {
            return;
        }

        Dom.attachStyle({
            suffix: 'base',
            css: BaseCss,
        });

        if (!ReactModoki.has(Controller)) {
            ReactModoki.mount(Controller, '.ControllerBoxContainer', 'afterbegin');
        }
    }

    recursiveShow(element) {
        if (element.tagName.toLowerCase() === 'body') {
            return;
        }
        element.classList.add('show');
        if (element.parentElement) {
            this.recursiveShow(element.parentElement);
        }
    }

    getBodyChildElement(element) {
        if (element.parentElement.tagName.toLowerCase() === 'body') {
            return element;
        } else {
            return this.getBodyChildElement(element.parentElement);
        }
    }
}

class Dom {
    static attachStyle(appendCss) {
        const id = `kusa5-ext-style${appendCss.suffix ? `-${appendCss.suffix}` : ''}`;
        let style = document.querySelector(`style#${id}`);
        if (!style) {
            style = document.createElement('style');
            style.id = id;
            document.body.appendChild(style);
        }

        if (appendCss.url) {
            fetch(appendCss.url).then((response) => {
                return response.text();
            }).then((css) => {
                appendCss.css = css;
                style.innerHTML = appendCss.css;
            });
        } else if (appendCss.css) {
            style.innerHTML = appendCss.css;
        }
    }

    static attachScript(url, target = 'body') {
        const targetDom = document.querySelector(target);
        if (!targetDom) {
            return null;
        }
        const tag = document.createElement('script');
        tag.setAttribute('type', 'text/javascript');
        tag.setAttribute('src', url);
        targetDom.appendChild(tag);

        return tag || null;
    }

    static attachTag(rawTag, target = 'body', position = 'inner') {
        const parser = new DOMParser();
        const dom = parser.parseFromString(rawTag, 'text/html').querySelector('body');
        const targetDom = typeof target === typeof '' ? document.querySelector(target) : target;
        if (!targetDom) {
            return null;
        }
        let tag;
        if (dom && dom.childNodes && dom.childNodes.length > 0) {
            const node = dom.childNodes[0];
            if (node) {
                tag = node;
            }
        }
        if (tag) {
            const name = tag.nodeName.toLowerCase();
            const id = tag.id;
            const currentTag = document.querySelector(`${name}#${id}`);
            if (currentTag && currentTag.parentNode) {
                currentTag.parentNode.removeChild(currentTag);
            }

            switch (position) {
                case 'beforebegin':
                case 'afterbegin':
                case 'beforeend':
                case 'afterend':
                    targetDom.insertAdjacentElement(position, tag);
                    break;
                case 'inner':
                default:
                    targetDom.appendChild(tag);
                    break;
            }
        }

        return tag || null;
    }
}

class ReactModoki {
    constructor() {
        this.state = {};
        this.self = `window.__reactmodoki__.${this.constructor.name}`;

        this._render = this.render;
        this.render = this.__render;

        this.__initialized = false;
    }

    setState(state, cb) {
        this.state = Object.assign(this.state, state);
        this.render();
        if (cb) {
            cb();
        }
    }

    __render() {
        if (!this.__initialized) {
            this.__initialized = true;
            if (this.componentDidMount) {
                this.componentDidMount();
            }
        }

        let shouldUpdate = true;
        if (this.shouldComponentUpdate) {
            shouldUpdate = this.shouldComponentUpdate();
        }

        if (shouldUpdate) {
            if (this.compornentWillUpdate) {
                this.compornentWillUpdate();
            }

            const tag = this._render();
            Dom.attachTag(`<div id="reactmodoki-${this.constructor.name}">${tag}</div>`, this.target);

            if (this.compornentDidUpdate) {
                this.compornentDidUpdate();
            }
        }
    }

    static mount(cls, target, position) {
        window.__reactmodoki__ = window.__reactmodoki__ || {};
        try {
            window.__reactmodoki__[cls.name] = new cls();
            window.__reactmodoki__[cls.name].target = target;
        } catch (e) {
            console.error(e);
            return null;
        }

        if (window.__reactmodoki__[cls.name].componentWillMount) {
            window.__reactmodoki__[cls.name].componentWillMount();
        }

        Dom.attachTag(`<div id="reactmodoki-${cls.name}"></div>`, target, position);

        if (window.__reactmodoki__[cls.name].render) {
            window.__reactmodoki__[cls.name].render();
        }
    }

    static unmount(cls) {
        window.__reactmodoki__ = window.__reactmodoki__ || {};
        if (window.__reactmodoki__[cls.name].componentWillUnmount) {
            window.__reactmodoki__[cls.name].componentWillUnmount();
        }
        if (window.__reactmodoki__[cls.name]) {
            delete window.__reactmodoki__[cls.name];
        }
    }

    static has(cls) {
        window.__reactmodoki__ = window.__reactmodoki__ || {};
        return window.__reactmodoki__[cls.name];
    }
}

class NiconicoPlayerHelper {
    static get reactContainer() {
        const container = document.querySelector('.VideoContainer');
        if (!container) {
            return null;
        }
        const reactInternalInstanceKey = Object.keys(container).find(key => key.startsWith('__reactInternalInstance'));
        if (!reactInternalInstanceKey) {
            return null;
        }

        if (!container[reactInternalInstanceKey] ||
            !container[reactInternalInstanceKey].child ||
            !container[reactInternalInstanceKey].child.stateNode) {
            return null;
        }
        return container[reactInternalInstanceKey].child.stateNode;
    }

    static get player() {
        const reactContainer = NiconicoPlayerHelper.reactContainer;
        if (!reactContainer || !reactContainer.videoPlayer) {
            return null;
        }

        return reactContainer.videoPlayer;
    }
}

class Controller extends ReactModoki {
    constructor() {
        super();
    }

    componentDidMount() {
    }

    render(props, state) {
        // TODO: impl
        return String.raw`
            <div>
                <button>さいせー/ていし</button>
            </div>
        `;
    }
}

new Fucker().start();
