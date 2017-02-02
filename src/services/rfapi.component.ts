import {Network} from "ionic-native";
import {Component, Injectable, NgZone, ApplicationRef} from "@angular/core";
import {Http, Headers, RequestOptions, URLSearchParams} from "@angular/http";
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import 'rxjs/Rx';
import { reorderArray, Platform, Events } from 'ionic-angular';
import {observable, autorun} from "mobx";
import { Issue } from './issues';
import PouchDB from 'pouchdb';


interface dataset {
    name:     string;
    title:    string;
    body:     string;
    id:       number;
    sort:     number;
    moddate:  number;
    modified: number;
    syncId:   string;
};

interface rfContributions {
    Documents: any;
    Hash: string;
    Limit: number;
    NumFound: number;
    Offset: number;
    QueryTime: number;
}


declare function emit (val: any);

@Injectable()

export class Api {
    http: any;
    storage:  any;
    current: number = 0;
    jwt: boolean = false;
    getOptions: any;
    postOptions: any;
    issues: any;
    current_issue: number = 0;
    initialized: any = false;
    onDevice: boolean;
    zone: any;
    events: any;
    sync: any;


    data: Array < dataset > = [];

    credentials: {user: string, rokey: string, rwkey: string, server: string} = {
      user:   "",
      rokey:  "",
      rwkey:  "",
      server: ""
    };


    constructor (
      http:Http,
      platform: Platform,
      zone: NgZone,
      events: Events,
      public applicationRef : ApplicationRef
    ) {
      this.http = http;
      this.events = events;
      let dbsettings = {
        size: 50,
        auto_compaction: true
      };
      this.storage = {
        issues      : new PouchDB('rfWriter-issues', dbsettings),
        settings    : new PouchDB('rfWriter-settings', dbsettings),
        data        : new PouchDB('rfWriter-data', dbsettings),
        credentials : new PouchDB('rfWriter-credentials', dbsettings)
      };
      this.current = 0;
      this.onDevice = platform.is('cordova');
      this.zone = zone;
      this.sync = null;
      this.initialize();
  }

  initialize() {
    console.log("Initializing API");
    this.storage.credentials.get('credentials').then((credentials) => {
      if (credentials) {
        console.log("- loading credentials");
        this.credentials = credentials.data;

        this.syncIssues();
        this.syncData();

        this.dbIssuesGet('issues').then((issues_offline) => {
          this.issues = issues_offline || false;
          this.storage.settings.get('current_issue').then((current_issue) => {

            console.log("--------> current issue:", current_issue);

            this.current_issue = current_issue.data ||
                                (this.issues === false ? false : this.issues.Issues[0].Id);
            /* Loading Local Data */
            this.loadData(this.current_issue);
          }).catch((error) => {
            this.current_issue = this.issues === false ? false : this.issues.Issues[0].Id;
            this.loadData(this.current_issue);
            console.log("---NO CURRENT ISSUE---", error);
          });
        });
      }
      else {
        this.initialized = true;
      }
    }).catch((error) => {
      console.log("---NO CREDENTIALS---", error);
    });
  }

  loadData(issue:number) {
    this.dbGet(issue).then((local_data) => {
      this.data = local_data || [];
      //this.dbIssuesGet('current').then((d) => {
      //  console.log("- loading current page");
      //  this.current = d || this.current;
        this.initialized = true;
        this.events.publish('page:change', this.current);
      //});
    })
  }

    syncIssues() {
      var __this = this;
      this.sync = {};
      this.sync.issues = this.storage.issues.sync(`${this.credentials.server}/rf-${this.credentials.user}`, {
        live: true,
        retry: true,
        continuous: true,
        auth: {
          username: __this.credentials.user,
          password: __this.credentials.rwkey
        }
      }).on('change', function (info) {
        // handle change
        if (info.direction === "pull") {
          console.log('GOT ISSUES SYNC');

          info.change.docs.forEach((d) => {

              /*
               Keys in the Database
               credentials
               current
               current_issue
               issues
              */


              if (d._id === "issues"){
                console.log("Sync Issues", d.data, __this);
                __this.issues = d.data;
              }
          });
          __this.zone.run(() => {});
        }
      })
      .on('paused',   function (err)  {console.log("----> paused");})
      .on('active',   function ()     {__this.jwt = true; console.log("----> active");})
      .on('denied',   function (err)  {__this.jwt = false; console.log("----> denied");})
      .on('complete', function (info) {console.log("----> complete");})
      .on('error',    function (err)  {__this.jwt = false; console.log("----> error");});
    }

    syncData() {
      var __this = this;
      console.log(`setting up sync data for issue ${this.current_issue}`)
      this.sync.data = this.storage.data.sync(`${this.credentials.server}/data-${this.credentials.user}`, {
        live: true,
        retry: true,
        continuous: true,
        auth: {
          username: __this.credentials.user,
          password: __this.credentials.rwkey
        }
      }).on('change', function (info) {
        // handle change

        //console.log(info)

        if (info.direction === "pull" ) {
          let fullSync = false;
          let reSort = false;

          console.log(info.change.docs, __this.data);

          info.change.docs.forEach((d) => {
            let needsUpdate = true;

            for (let k = 0; k < __this.data.length; k++) {
              let ld = __this.data[k];
              console.log(k, d, ld);
              if (d._id.indexOf(ld.syncId) !== -1) {
                if (d._deleted === true) {
                  console.log(`add ${k} to delete array`, ld);
                  __this.data.splice(k, 1);
                  __this.data.forEach((e,i) => {
                    if (e.sort != i) {
                      e.sort = i;
                    }
                  })
                }
                else {
                  console.log(`GOT DATA SYNC ---> ${ld.syncId}`, d.data);
                  __this.data[k] = d.data;
                  needsUpdate = false;
                  if (ld.sort != d.data.sort) {
                    reSort = true;
                  }
                }
              }
            }
            if (needsUpdate) fullSync = true;
          });


          if (fullSync) {
            console.log(`FULL SYNC NEEDED`);
            __this.loadData(__this.current_issue);
          }
          else if (reSort) {
            console.log(`RESORT NEEDED`);
            __this.data.sort(function (a, b) {
              return a.sort - b.sort;
            });
          }
          __this.zone.run(() => {});
        }
      })
    }

    dbIssuesStore(document:string, data:any): Promise<any> {
      let __this = this;
      return new Promise(resolve => {
        __this.storage.issues.get(document)
        .then(function(doc) {
          __this.storage.issues.put({
            _id: document,
            _rev: doc._rev,
            data: data
          }).then((response) => {
            resolve(true);
          }).catch((err) => {
            resolve(false);
          });
        })
        .catch(function (err) {
          __this.storage.issues.put({
            _id: document,
            data: data
          })
          .then((response) => {
            resolve(true);
          })
          .catch((err)=>{
            resolve(false);
          })
        });
      });
    }

    dbIssuesGet(document:string): Promise<any> {
      var __this = this;
      return new Promise(resolve => {
        __this.storage.issues.get(document).then(function(doc) {
          resolve(doc.data);
        }).catch(function (err) {
          __this.storage.issues.put({
            _id: document,
            data: false
          }).then(function(doc) {
            resolve(false);
          });
        });
      });
    }

   /**
    *
    *  Store Documents
    *
    **/

    dbStore(issue:number, data:any): Promise<any> {
      let __this = this;
      let document = `contribution-${issue}-${data.syncId}`;
      return new Promise(resolve => {
        if (!this.current_issue) {
          resolve(false);
          return;
        }
        __this.storage.data.get(document)
        .then(function(doc) {
          __this.storage.data.put({
            _id: document,
            _rev: doc._rev,
            data: data
          }).then((response) => {
            resolve(true);
          }).catch((err) => {
            resolve(false);
          });
        })
        .catch(function (err) {
          __this.storage.data.put({
            _id: document,
            data: data
          })
          .then((response) => {
            resolve(true);
          })
          .catch((err)=>{
            resolve(false);
          })
        });
      });
    }

    /**
     *
     *  Bulk Load Documents - on Init and Issue change
     *
     **/

    dbGet(issue:number): Promise<any> {
      var __this = this;
      return new Promise(resolve => {
        console.log(`ok - here we go. trying to read all contributions starting with: contribution-${issue}`);

        __this.storage.data.allDocs({
          include_docs: true,
          attachments: true,
          startkey: `contribution-${issue}`,
          endkey: `contribution-${issue}\uffff`
        }).then(function (result) {
          let _data = [];
          result.rows.sort(function (a, b) {
            return a.doc.data.sort - b.doc.data.sort;
          });
          result.rows.forEach((d) => {
            _data.push(d.doc.data);
          })
          //console.log(result.rows);
          resolve(_data);
        }).catch(function (err) {
          console.log(err);
        });
      });
    }

    changeIssue() {
        var __this = this;
        return new Promise(resolve => {
          __this.storage.settings.get('current_issue')
          .then(function(doc) {
            __this.storage.settings.put({
              _id: 'current_issue',
              _rev: doc._rev,
              data: __this.current_issue
            }).then((response) => {
              console.log("Switched to " + __this.current_issue);
              __this.setCurrent(0);
              __this.loadData(__this.current_issue);
              resolve(true);
            }).catch((err) => {
              resolve(false);
            });
          })
          .catch(function (err) {
            __this.storage.settings.put({
              _id: 'current_issue',
              data: __this.current_issue
            })
            .then((response) => {
              console.log("Switched to " + __this.current_issue);
              __this.setCurrent(0);
              __this.loadData(__this.current_issue);
              resolve(true);
            })
            .catch((err)=>{
              resolve(false);
            })
          });
        });
    }

    change() {
      if (this.initialized === false) return;
      this.data[this.current].modified = 0;
      this.dbStore(this.current_issue, this.data[this.current]);
      console.log('Local Store Doc Complete', this.current, this.data[this.current]);
    }

    reorder(indexes){
      if (this.initialized === false) return;
      this.data = reorderArray(this.data, indexes);
      this.data.forEach((e,i) => {
        if (e.sort != i) {
          e.sort = i;
          this.dbStore(this.current_issue, e);
        }
      })
    }

    delete(item) {
      if (this.initialized === false) return;

      // Move Page back before delete if on the last page
      if (this.current == this.data.length - 1 && this.current > 0) {
        this.current--;
        this.events.publish('page:change', this.current);
      }

      let _delete = this.data.splice(item, 1);
      let _doc = `contribution-${this.current_issue}-${_delete[0].syncId}`;
      let __this = this;
      console.log(`Deleting: ${_doc}`);

      this.storage.data.get(_doc).then(function (doc) {
        console.log(`Deleted ${_delete[0].syncId} from DB`);
        /*__this.data.forEach((e,i) => {
          if (e.sort != i) {
            e.sort = i;
            __this.dbStore(__this.current_issue, e);
          }
        })*/
        return __this.storage.data.remove(doc);
      });
    }

    add(position: number) {
      let _data = {
        name: 'rf001',
        title: 'Empty Title',
        body: "Write Here",
        id: 0,
        sort: 0,
        moddate: 0,
        modified: 0,
        syncId: this.guid(),
      };
      let __this = this;
      return new Promise(resolve => {
        this.dbStore(this.current_issue, _data).then((d) => {
          __this.data.splice(position, 0, _data);
          __this.data.forEach((e,i) => {
            if (e.sort != i) {
              e.sort = i;
              this.dbStore(this.current_issue, e);
            }
          })
          __this.setCurrent(position);
          setTimeout(() => {
            this.applicationRef.tick();
            setTimeout(() => {
              __this.events.publish('page:change', position);
            }, 250);
          }, 250);
          resolve(true);
        });
      });
    }

    setCurrent(id:number) {
      if (this.initialized === false) return;
      console.log("Updating Current Set ", id);
      this.current = id;
    }

    getCurrentData() {
      return this.data[this.current];
    }

    getCurrent() {
      return this.current;
    }

    /* Called if settings changed */
    storeCredentials() {
      var __this = this;
      return new Promise(resolve => {
        __this.storage.credentials.get('credentials')
        .then(function(doc) {
          __this.storage.credentials.put({
            _id: 'credentials',
            _rev: doc._rev,
            data: __this.credentials
          }).then((response) => {
            if (!this.initialized) {
              this.initialize();
            }
            resolve(true);
          }).catch((err) => {
            resolve(false);
          });
        })
        .catch(function (err) {
          __this.storage.credentials.put({
            _id: 'credentials',
            data: __this.credentials
          })
          .then((response) => {
            if (!this.initialized) {
              this.initialize();
            }
            resolve(true);
          })
          .catch((err)=>{
            resolve(false);
          })
        });
      });
    }

    logIn() {
      if (this.jwt == false) {
        this.syncIssues();
        this.syncData();
      }
    }

    logOut() {
      this.jwt = false;
      if (this.sync) {
        this.sync.issues.cancel(); // whenever you want to cancel
        this.sync.data.cancel();
        this.sync = null;
      }
    }

    guid() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
    }
}
