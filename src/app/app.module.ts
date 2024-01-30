import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { ProsemirrorModule } from 'ng2-prosemirror';
import { CodemirrorModule } from 'ng2-codemirror';
import { BrowserModule } from '@angular/platform-browser';
import { HttpModule} from '@angular/http';
import { MyApp } from './app.component';
import { Settings } from '../pages/settings/settings';
import { Editor } from '../pages/editor/editor';
import { PopoverEditor } from '../pages/editor/editor-popover';
import { PopoverSettings } from '../pages/editor/settings-popover';
import { ImagePopover } from '../pages/editor/image-popover';
import { MarkdownPopover } from '../pages/book/markdown-popover';
import { LiteraturePopover } from '../pages/book/literature-popover';

import { Exports } from '../pages/exports/exports';
import { PopoverPage } from '../pages/exports/exports-popover';
import { Book } from '../pages/book/book';
import { Autoresize } from '../directives/shrink';
import { AutoGrowDirective } from '../directives/autogrow';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { MyFilterPipe } from '../pipes/myfilter.pipe';

@NgModule({
  declarations: [
    MyApp,
    Settings,
    Editor,
    PopoverEditor,
    LiteraturePopover,
    Book,
    Exports,
    PopoverPage,
    ImagePopover,
    PopoverSettings,
    MarkdownPopover,
    Autoresize,
    AutoGrowDirective,
    MyFilterPipe
  ],
  imports: [
    HttpModule,
    BrowserModule,
    IonicModule.forRoot(MyApp),
    ProsemirrorModule,
    PdfViewerModule,
    CodemirrorModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    Settings,
    Editor,
    Book,
    PopoverEditor,
    LiteraturePopover,
    ImagePopover,
    PopoverPage,   
    PopoverSettings,
    MarkdownPopover, 
    Exports
  ],
  providers: [
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
