var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from "@angular/core";
import { Http, Headers, RequestOptions } from "@angular/http";
import { Observable } from 'rxjs/Observable';
import 'rxjs/Rx';
var favorites = [], propertiesURL = '/properties', favoritesURL = '/favorites';
var PropertyService = (function () {
    function PropertyService(http) {
        this.http = http;
        this.storage = 0;
    }
    PropertyService.prototype.findAll = function () {
        return this.http.get(propertiesURL)
            .map(function (res) { return res.json(); })
            .catch(this.handleError);
    };
    PropertyService.prototype.store = function () {
        this.storage++;
    };
    PropertyService.prototype.get = function () {
        return this.storage;
    };
    PropertyService.prototype.favorite = function (property) {
        var body = JSON.stringify(property);
        var headers = new Headers({ 'Content-Type': 'application/json' });
        var options = new RequestOptions({ headers: headers });
        return this.http.post(favoritesURL, body, options)
            .map(function (res) { return res.json(); })
            .catch(this.handleError);
    };
    PropertyService.prototype.handleError = function (error) {
        console.error(error);
        return Observable.throw(error.json().error || 'Server error');
    };
    return PropertyService;
}());
PropertyService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Http])
], PropertyService);
export { PropertyService };
//# sourceMappingURL=rfapi.component.js.map