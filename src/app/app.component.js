var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ViewChild } from '@angular/core';
import { Nav, Platform } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';
import { Page1 } from '../pages/page1/page1';
import { Page2 } from '../pages/page2/page2';
import { Editor } from '../pages/editor/editor';
import { Storage } from '@ionic/storage';
import { PropertyService } from '../services/rfapi.component';
var MyApp = (function () {
    function MyApp(platform, propertyService, storage) {
        this.platform = platform;
        this.rootPage = Editor;
        this.initializeApp();
        this.pages = [
            { title: 'Page One', component: Page1 },
            { title: 'Page Two', component: Page2 },
            { title: 'Editor', component: Editor }
        ];
        storage.set('name', 'Max');
    }
    MyApp.prototype.initializeApp = function () {
        this.platform.ready().then(function () {
            StatusBar.styleDefault();
            Splashscreen.hide();
        });
    };
    MyApp.prototype.openPage = function (page) {
        this.nav.setRoot(page.component);
    };
    return MyApp;
}());
__decorate([
    ViewChild(Nav),
    __metadata("design:type", Nav)
], MyApp.prototype, "nav", void 0);
MyApp = __decorate([
    Component({
        templateUrl: 'app.html',
        providers: [PropertyService, Storage]
    }),
    __metadata("design:paramtypes", [Platform, PropertyService, Storage])
], MyApp);
export { MyApp };
//# sourceMappingURL=app.component.js.map