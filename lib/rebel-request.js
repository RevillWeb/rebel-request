/**
 * Created by Leon Revill on 15/12/2015.
 * Blog: http://www.revilweb.com
 * GitHub: https://github.com/RevillWeb
 * Twitter: @RevillWeb
 */

import * as RebelCore from 'rebel-core';

class Request {
    static cache;
    constructor(config, baseUrl, method, params, payload) {
        if (Request.cache === undefined) {
            Request.cache = {};
        }
        this.xhr = new XMLHttpRequest();
        this.baseUrl = baseUrl;
        this.path = undefined;
        this.params = params;
        this.payload = payload;
        this.method = method;
        this.config = config;
    }
    at(path) {
        this.path = path || "";
        return this.execute();
    }
    execute() {
        const url = Request.interpolate(this.baseUrl + this.path, this.params) + Request.buildParamString(this.params);
        return new Promise((resolve, reject) => {
            if (this.config.cache === true && Request.cache[url] !== undefined) {
                resolve(Request.cache[url]);
            } else {
                this.xhr.open(this.method.toUpperCase(), url);
                this.xhr.onreadystatechange = (event) => {
                    if (event.target.readyState === 4) {
                        let result = (event.target.responseText.length > 0) ? event.target.responseText : null;
                        if (this.config.responseType == "json") {
                            result = Request.fromJson(result);
                        }
                        if (event.target.status === 200) {
                            if (this.config.cache === true) {
                                Request.cache[url] = result;
                            }
                            resolve(result);
                        } else {
                            reject(result);
                        }
                    }
                };
                if (["post", "put"].indexOf(this.method) > -1) {
                    this.xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
                }
                const data = (this.payload !== undefined) ? Request.toJson(this.payload) : "";
                this.xhr.send(data);
            }
        });
    }
    static buildParamString(params) {
        let paramString = "";
        if (params != undefined && Object.keys(params).length > 0) {
            paramString = "?";
            if (typeof params == "object") {
                for (var key in params) {
                    if (paramString != "?") {
                        paramString += "&";
                    }
                    paramString += key + "=" + encodeURIComponent(params[key]);
                }
            } else {
                paramString += params;
            }
        }
        return paramString;
    }
    static interpolate(url, params) {
        if (typeof params == "object") {
            for (var key in params) {
                const find = "{" + key + "}";
                if (url.indexOf(find) > -1) {
                    url = url.replace(find, params[key]);
                    delete params[key];
                }
            }
        }
        return url;
    }
    static toJson(obj) {
        let str = "";
        if (typeof obj == "object") {
            try {
                str = JSON.stringify(obj);
            } catch (e) {
                console.error("Invalid JSON object provided. ");
            }
        }
        return str;
    }
    static fromJson(str) {
        let obj = null;
        if (typeof str == "string") {
            try {
                obj = JSON.parse(str);
            } catch (e) {
                console.error("Invalid JSON string provided. ");
            }
        }
        return obj;
    }
}

class JpRequest {
    static count;
    constructor(config, baseUrl, params) {
        if (isNaN(JpRequest.count++)) {
            JpRequest.count = 0;
        }
        this.baseUrl = baseUrl;
        this.path = undefined;
        this.params = params;
        this.config = config;
    }
    at(path) {
        this.path = path;
        return this.execute();
    }
    execute() {
        const timeout = 5000;
        let url = this.baseUrl + this.path + Request.buildParamString(this.params);
        return new Promise((resolve, reject) => {
            let callback = '__callback' + JpRequest.count++;
            const timeoutId = window.setTimeout(() => {
                reject(new Error('Request timeout.'));
            }, timeout);
            window[callback] = response => {
                window.clearTimeout(timeoutId);
                resolve(Request.fromJson(response));
            };
            const script = document.createElement('script');
            script.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + callback;
            script.onload = () => {
                script.remove();
            };
            document.getElementsByTagName('head')[0].appendChild(script);
        });
    }
}

export class RebelRequest {
    constructor(baseUrl, config) {
        this.baseUrl = baseUrl || "";
        this.config = {
            "responseType": "json"
        };
        this.config = RebelCore.merge(this.config, config);
        return this;
    }
    get(params) {
        return new Request(this.config, this.baseUrl, "get", params);
    }
    getJson(params) {
        return new JpRequest(this.config, this.baseUrl, params);
    }
    post(payload, params) {
        return new Request(this.config, this.baseUrl, "post", params, payload);
    }
    put(payload, params) {
        return new Request(this.config, this.baseUrl, "put", params, payload);
    }
    delete(params) {
        return new Request(this.config, this.baseUrl, "delete", params);
    }
}