// src/main/index.ts
import { app, BrowserWindow, shell, session } from 'electron'
import { join } from 'path'
import { createTray } from './tray'

const ZALO_URL = 'https://chat.zalo.me'
const ZALO_HOSTS = ['chat.zalo.me', 'zalo.me', 'id.zalo.me', 'account.zalo.me']

let mainWindow: BrowserWindow | null = null
let isQuitting = false

app.on('before-quit', () => {
    isQuitting = true
})

/**
 * User-Agent giả lập Zalo PC Windows chính thức.
 * Giúp Zalo server nhận diện app như Zalo Desktop → cho phép lưu tin nhắn vĩnh viễn.
 */
const ZALO_PC_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) ZaloPC/26.3.10 Chrome/108.0.5359.215 Electron/22.3.9 Safari/537.36'

function createWindow() {
    // Đặt UA mặc định cho toàn app = Zalo PC Windows
    app.userAgentFallback = ZALO_PC_USER_AGENT

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

    // Override User-Agent ở MỌI tầng:
    // 1. Session UA → quyết định navigator.userAgent trong JavaScript
    const ses = session.fromPartition('persist:zalo')
    ses.setUserAgent(ZALO_PC_USER_AGENT)

    // 2. WebContents UA → đảm bảo webContents cũng dùng đúng UA
    mainWindow.webContents.setUserAgent(ZALO_PC_USER_AGENT)

    // 3. HTTP headers → override trực tiếp header cho mọi request
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = ZALO_PC_USER_AGENT
        callback({ requestHeaders: details.requestHeaders })
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
        const isZalo = ZALO_HOSTS.some(host => url.includes(host))
        if (!isZalo) {
            shell.openExternal(url)
            return { action: 'deny' }
        }
        return { action: 'allow' }
    })

    // Thêm: cho phép navigation trong cùng window
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const isZalo = ZALO_HOSTS.some(host => url.includes(host))

        if (!isZalo) {
            event.preventDefault()
            shell.openExternal(url)
        }
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
