const electron = require('electron')
const fs = require('fs')
const log = require('electron-log');
const {autoUpdater} = require("electron-updater");

// Module to control application life.
const app = electron.app
const dialog = electron.dialog
const ipcMain = electron.ipcMain

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

// Menu Stuff
const Menu = electron.Menu
const MenuItem = electron.MenuItem

// Report crashes to our server.
//const CrashReporter = electron.CrashReporter;
//CrashReporter.start();

const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {

  let filename = "";

  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false, 
    width: 800, 
    height: 600,
    icon: path.join(__dirname, 'assets/electron_icons/256x256.png'),
    webPreferences: {
      plugins: true
    }
  })
  mainWindow.once('ready-to-show', function() {
    mainWindow.show();
  })


  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  mainWindow.on('leave-full-screen', function(e) {
    mainWindow.webContents.send('main:ipc', 'leave-full-screen');
  })
  mainWindow.on('enter-full-screen', function(e) {
    mainWindow.webContents.send('main:ipc', 'enter-full-screen');
  })


  ipcMain.on('master:ipc:export', (event, message) => {
     if (filename !== "") {
       fs.writeFile(filename, `Identifier: ${message.name}\n\nTitle: ${message.title}\n\n${message.body}`, function (err) {});
       filename = "";
     }
  });

  ipcMain.on('master:ipc:saveattachment', (event, message) => {
    dialog.showSaveDialog({
       title: "Save Document",
       filters: [
        { name: 'export', extensions: ['pdf'] }
       ]
    }, function(_fileName){
      if (_fileName === undefined) return;
        fs.writeFile(_fileName, message, 'base64', function (err) {});
        _fileName = "";
    })
  });

  // Create the Application's main menu
   var template = [{
     label: 'Rokfor Writer',
     submenu: [
       {
         label: 'About Rokfor Writer',
         selector: 'orderFrontStandardAboutPanel:'
       },
       {
         type: 'separator'
       },
       {
         label: 'Services',
         submenu: []
       },
       {
         type: 'separator'
       },
       {
         label: 'Hide Electron',
         accelerator: 'Command+H',
         selector: 'hide:'
       },
       {
         label: 'Hide Others',
         accelerator: 'Command+Shift+H',
         selector: 'hideOtherApplications:'
       },
       {
         label: 'Show All',
         selector: 'unhideAllApplications:'
       },
       {
         type: 'separator'
       },
       {
        label: 'Check for Updates',
        click: function() { autoUpdater.checkForUpdates(); }
       },
       {
         label: 'Quit',
         accelerator: 'Command+Q',
         click: function() { app.quit(); }
       },
     ]
   },
   {
     label: 'File',
     submenu: [
       {
         label: 'New Document',
         accelerator: 'Command+N',
         click: function() {
           mainWindow.webContents.send('main:ipc', 'new-document');
         }
       },
       {
         label: 'Save',
         accelerator: 'Command+S',
         click: function() {
           mainWindow.webContents.send('main:ipc', 'save-document');
         }
       },
       {
         label: 'Delete',
         accelerator: 'Command+D',
         click: function() {
           mainWindow.webContents.send('main:ipc', 'delete-document');
         }
       },       
       {
         type: 'separator'
       },
       {
         label: 'Export',
         accelerator: 'Command+E',
         click: function() {
           dialog.showSaveDialog({
             title: "Export Data",
             filters: [
              { name: 'markdown', extensions: ['md'] }
             ]
           }, function(_fileName){
             if (_fileName === undefined) return;
             filename = _fileName;
             let _data = mainWindow.webContents.send('main:ipc', 'export-data');
           })
         }
       },
       {
         label: 'Print',
         accelerator: 'Command+P',
         click: function() {
           mainWindow.webContents.send('main:ipc', 'print-document');
         }
       }
     ]
   },
   {
     label: 'Edit',
     submenu: [
       {
         label: 'Undo',
         accelerator: 'Command+Z',
         selector: 'undo:'
       },
       {
         label: 'Redo',
         accelerator: 'Shift+Command+Z',
         selector: 'redo:'
       },
       {
         type: 'separator'
       },
       {
         label: 'Cut',
         accelerator: 'Command+X',
         selector: 'cut:'
       },
       {
         label: 'Copy',
         accelerator: 'Command+C',
         selector: 'copy:'
       },
       {
         label: 'Paste',
         accelerator: 'Command+V',
         selector: 'paste:'
       },
       {
         label: 'Select All',
         accelerator: 'Command+A',
         selector: 'selectAll:'
       },
       {
         type: 'separator'
       },
       {
         label: 'Previous Document',
         accelerator: 'Alt+Command+Left',
         click: function() {
           mainWindow.webContents.send('main:ipc', 'previous-document');
         }
       },
       {
         label: 'Next Document',
         accelerator: 'Alt+Command+Right',
         click: function() {
           mainWindow.webContents.send('main:ipc', 'next-document');
         }
       },
       {
         type: 'separator'
       },
       {
         label: 'Set Title',
         accelerator: 'Command+T',
         click: function() {
           mainWindow.webContents.send('main:ipc', 'set-title');
         }
       },
       {
         label: 'Set Identifier',
         accelerator: 'Command+I',
         click: function() {
           mainWindow.webContents.send('main:ipc', 'set-identifier');
         }
       }
     ]
   },
   {
     label: 'View',
     submenu: [
       {
         label: 'Toggle Full Screen',
         accelerator: 'Alt+Command+F',
         click: function() {
           BrowserWindow.getFocusedWindow().setFullScreen(BrowserWindow.getFocusedWindow().isFullScreen() ? false : true);
         }
       },
       {
         label: 'Reload',
         accelerator: 'Command+R',
         click: function() { BrowserWindow.getFocusedWindow().reload(); }
       },
       {
         label: 'Toggle DevTools',
         accelerator: 'Alt+Command+I',
         click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
       },
     ]
   },
   {
     label: 'Window',
     submenu: [
       {
         label: 'Minimize',
         accelerator: 'Command+M',
         selector: 'performMiniaturize:'
       },
       {
         label: 'Close',
         accelerator: 'Command+W',
         selector: 'performClose:'
       },
       {
         type: 'separator'
       },
       {
         label: 'Bring All to Front',
         selector: 'arrangeInFront:'
       },
     ]
   },
   {
     label: 'Help',
     submenu: []
   }];

   menu = Menu.buildFromTemplate(template);
   Menu.setApplicationMenu(menu);








}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

//-------------------------------------------------------------------
// Auto Update
//-------------------------------------------------------------------
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
app.on('ready', function()  {
  autoUpdater.checkForUpdatesAndNotify();
});
