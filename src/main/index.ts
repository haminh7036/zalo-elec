// src/main/index.ts
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { createTray } from './tray'

const ZALO_URL = 'https://chat.zalo.me'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

app.on('before-quit', () => {
    isQuitting = true
})

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'Zalo',
        icon: join(__dirname, '../../resources/icon.png'),
        webPreferences: {
            // Không cần preload nếu chỉ wrap web
            contextIsolation: true,
            sandbox: true,              // bật sandbox — web wrapper không cần Node access
            partition: 'persist:zalo', // session riêng, giữ login giữa các lần
        },
        autoHideMenuBar: true,
    })

    mainWindow.loadURL(ZALO_URL)

    mainWindow.webContents.session.setPermissionRequestHandler(
        (webContents, permission, callback) => {
            const allowed = ['notifications', 'media', 'microphone', 'camera']
            callback(allowed.includes(permission))
        }
    )

    // Mở link ngoài (download, external) bằng system browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const zaloHosts = ['chat.zalo.me', 'zalo.me', 'id.zalo.me', 'account.zalo.me']
        const isZalo = zaloHosts.some(host => url.includes(host))
        if (!isZalo) {
            shell.openExternal(url)
            return { action: 'deny' }
        }
        return { action: 'allow' }
    })

    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault()
            mainWindow?.hide() // minimize to tray thay vì quit
        }
    })
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        mainWindow?.show()
        mainWindow?.focus()
    })
}

app.whenReady().then(() => {
    createWindow()
    createTray(mainWindow!)

    // Linux: re-show nếu click dock/taskbar
    app.on('activate', () => {
        if (!mainWindow?.isVisible()) mainWindow?.show()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
