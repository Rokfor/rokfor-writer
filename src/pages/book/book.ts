import { Component, ViewChild } from '@angular/core';
import { ModalController, NavController } from 'ionic-angular';
import { Api } from '../../services/rfapi.component';
import { MarkdownPopover } from './markdown-popover';
import { LiteraturePopover } from './literature-popover';
/*
  Generated class for the Book page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-book',
  templateUrl: 'book.html'
})

export class Book {
  
  constructor(
    public api:Api,
    public navCtrl: NavController,
    private modalCtrl: ModalController
  ) {
  }

  ionViewDidLoad() {
    //console.log(this.api.issues, this.api.current.issue);
  }

  showModal(index:number, label:string) {
    const before = this.api.current.issue_options.Options[index].value ?? "";
    const modal = this.modalCtrl.create(
      MarkdownPopover, {value: before, label: label, api: this.api}, {showBackdrop: true, enableBackdropDismiss: false}
    )
    modal.onDidDismiss(data => {
      if (data != null && data != before) {
        this.api.current.issue_options.Options[index].value = data;
        this.api.bookStore()
      }
    })
    modal.present();
  }  

  showLiteratureModal() {
    const modal = this.modalCtrl.create(
      LiteraturePopover, {api: this.api}, {showBackdrop: true, enableBackdropDismiss: false}
    )
    modal.present();
  }  

  


  getAttachements() {
    // @ts-ignore
    return this.api.editorMarks.attachements
  }

  deleteIssue(issueId) {
    let _confirm = this.api.alert.create({
      title: "Delete Book",
      message: `Are you sure you want to delete book id <b>${issueId}</b>? 
                If you are the only user, the book will be removed permanently.
                Shared books remain active for all other members.`,
      buttons: [
        {
          text: 'Cancel',
          handler: data => {}
        },
        {
          text: 'Delete',
          handler: data => {
            this.api._call("/delete", `Deleted Book ${issueId}`, {issue: issueId}, false);
          }
        }
      ]
    });
    _confirm.present();
  }  


  shareIssue(issueId) {
    let _confirm = this.api.alert.create({
      title: "Share Book",
      message: "Please enter the access key user to invite:",
      inputs: [
        {
          name: "invite",
          placeholder: "xxxxxxxxxxxxx-xxxxxxxxxxxx"
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          handler: data => {}
        },
        {
          text: 'Save',
          handler: data => {
            console.log(data.invite);
            this.api._call("/share", "You just shared a book.", {issue: issueId, invite: data.invite}, false);
          }
        }
      ]
    });
    _confirm.present();
  }

  addIssue() {
    this.api._call("/add", "There is a new issue in your booklist", {}, false);
  }

}
