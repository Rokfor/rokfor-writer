import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { CodemirrorModule } from 'ng2-codemirror';
import { MyApp } from './app.component';
import { Settings } from '../pages/settings/settings';
import { Editor } from '../pages/editor/editor';
import { Book } from '../pages/book/book';

@NgModule({
  declarations: [
    MyApp,
    Settings,
    Editor,
    Book
  ],
  imports: [
    IonicModule.forRoot(MyApp),
    CodemirrorModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    Settings,
    Editor,
    Book
  ],
  providers: [{provide: ErrorHandler, useClass: IonicErrorHandler}]
})
export class AppModule {}
