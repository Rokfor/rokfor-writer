var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ActionSheetController } from 'ionic-angular';
import { PropertyService } from '../../services/rfapi.component';
var Page1 = (function () {
    function Page1(navCtrl, actionSheetCtrl, propertyService) {
        this.navCtrl = navCtrl;
        this.actionSheetCtrl = actionSheetCtrl;
        this.propertyService = propertyService;
    }
    Page1.prototype.add = function () {
        this.propertyService.store();
    };
    Page1.prototype.presentActionSheet = function () {
        var actionSheet = this.actionSheetCtrl.create({
            title: 'Modify your album',
            buttons: [
                {
                    text: 'Destructive',
                    role: 'destructive',
                    handler: function () {
                        console.log('Destructive clicked');
                    }
                }, {
                    text: 'Archive',
                    handler: function () {
                        console.log('Archive clicked');
                    }
                }, {
                    text: 'Cancel',
                    role: 'cancel',
                    handler: function () {
                        console.log('Cancel clicked');
                    }
                }
            ]
        });
        actionSheet.present();
    };
    return Page1;
}());
Page1 = __decorate([
    Component({
        selector: 'page-page1',
        templateUrl: 'page1.html'
    }),
    __metadata("design:paramtypes", [NavController, ActionSheetController, PropertyService])
], Page1);
export { Page1 };
//# sourceMappingURL=page1.js.map