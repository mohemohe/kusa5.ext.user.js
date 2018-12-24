// ==UserScript==
// @name         Kusa5.ext
// @namespace    net.ghippos.ext.kusa5
// @version      0.99
// @description  Next generation of kusa5.mod.user.js. Based on the original HTML5 player by Niconico.
// @author       mohemohe
// @match        *.nicovideo.jp/watch/*
// @grant        none
// ==/UserScript==

const BaseCss = String.raw`
.ControllerBoxContainer {
    position: relative !important;
}

#reactmodoki-Controller {
    position: absolute;
    top: 0;
    left: 0;
}

.SeekBarContainer,
.ControllerContainer {
    visibility: hidden !important;
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

        if (!Controller.has()) {
            Controller.mount('.ControllerBoxContainer', 'afterbegin');
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

            if (target !== null) {
                const targetDom = typeof target === typeof '' ? document.querySelector(target) : target;
                if (!targetDom) {
                    return null;
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

    bind(func) {
        return `${this.self}.${func.name.split(' ').pop()}(...arguments)`;
    }

    setState(state, cb) {
        this.state = Object.assign(this.state, state);
        this.render();
        if (cb) {
            cb();
        }
    }

    forceUpdate(cb) {
        this.render();
        if (cb) {
            cb();
        }
    }

    __render(block) {
        if (this.parent && !block) {
            return this.parent.__render(true);
        }
        
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
            const dom = Dom.attachTag(`<div id="reactmodoki-${this.constructor.name}">${tag}</div>`, this.target, this.position);

            if (this.compornentDidUpdate) {
                this.compornentDidUpdate();
            }

            return dom;
        }
    }

    static mount(target, position, parent = null) {
        window.__reactmodoki__ = window.__reactmodoki__ || {};
        if (!window.__reactmodoki__[this.name]) {
            try {
                window.__reactmodoki__[this.name] = new this();
                window.__reactmodoki__[this.name].target = target;
                window.__reactmodoki__[this.name].position = position;
                window.__reactmodoki__[this.name].parent = parent;
            } catch (e) {
                console.error(e);
                return null;
            }
    
            if (window.__reactmodoki__[this.name].componentWillMount) {
                window.__reactmodoki__[this.name].componentWillMount();
            }
    
            Dom.attachTag(`<div id="reactmodoki-${this.name}"></div>`, target, position);
        }

        if (target === null) {
            return window.__reactmodoki__[this.name].__render(true);
        } else if (window.__reactmodoki__[this.name].render) {
            return window.__reactmodoki__[this.name].render();
        }
    }

    static unmount() {
        window.__reactmodoki__ = window.__reactmodoki__ || {};
        if (window.__reactmodoki__[this.name].componentWillUnmount) {
            window.__reactmodoki__[this.name].componentWillUnmount();
        }
        if (window.__reactmodoki__[this.name]) {
            delete window.__reactmodoki__[this.name];
        }
    }

    static has() {
        window.__reactmodoki__ = window.__reactmodoki__ || {};
        return window.__reactmodoki__[this.name];
    }

    static embed(parent) {
        if (this.has()) {
            return this.has().__render(true).outerHTML;
        } else {
            return this.mount(null, null, parent).outerHTML;
        }
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

        this.state = {
            paused: true,
        };

        this.onClickPlayPauseButton = this.onClickPlayPauseButton.bind(this);
        this.onClickOriginalSettingButton = this.onClickOriginalSettingButton.bind(this);
    }

    componentDidMount() {
        // debug
        window.player = NiconicoPlayerHelper.player;
    }

    async onClickPlayPauseButton() {
        const paused = await NiconicoPlayerHelper.player.paused();
        if (paused) {
            NiconicoPlayerHelper.player.play()
        } else {
            NiconicoPlayerHelper.player.pause()
        }

        this.setState({
            paused: !paused,
        });
    }

    onClickOriginalSettingButton() {
        const playerOptionContainer = document.querySelector(".PlayerOptionContainer");
        if (playerOptionContainer) {
            playerOptionContainer.classList.toggle("is-hidden");
        }
    }

    render() {
        // TODO: impl
        return String.raw`
            <div style="height: calc(80px - 32px); color: white;">
                <button onclick="${this.bind(this.onClickPlayPauseButton)}">${this.state.paused ? '再生' : '停止'}</button>
                <button onclick="${this.bind(this.onClickOriginalSettingButton)}">設定</button>
                ${PlayTime.embed(this)}
            </div>
        `;
    }
}

class PlayTime extends ReactModoki {
    constructor() {
        super();

        this.timerHandler = null;

        this.state = {
            currentTime: 0,
            duration: 0,
        };

        this.onInputSeekbar = this.onInputSeekbar.bind(this);
    }

    componentDidMount() {
        this.timerHandler = setInterval(() => this.onInterval(), 500);
    }

    componentWillUnmount() {
        clearInterval(this.timerHandler);
    }

    async onInterval() {
        const currentTime = NiconicoPlayerHelper.player.currentTime();
        let duration = NiconicoPlayerHelper.player.duration();
        if (isNaN(duration)) {
            duration = 0;
        }

        if (this.state.currentTime != currentTime || this.state.duration != duration) {
            this.setState({
                currentTime,
                duration,
            });
        }
    }

    onInputSeekbar(event) {
        const seekTarget = parseInt(event.target.value, 10);
        if (!isNaN(seekTarget)) {
            NiconicoPlayerHelper.player.currentTime(seekTarget);
        }
    }

    render() {
        return String.raw`
            <div>
                <div>
                    <input type="range" value="${this.state.currentTime}" min="0" max="${this.state.duration}" step="1" oninput="${this.bind(this.onInputSeekbar)}">
                    ${this.state.currentTime} / ${this.state.duration}
                </div>
            </div>
        `;
    }
}

new Fucker().start();
