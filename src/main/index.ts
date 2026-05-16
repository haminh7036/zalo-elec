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
 * Loại bỏ "Electron/xxx" và tên app khỏi User-Agent
 * để Zalo không detect Electron và cho phép hiển thị trang QR login.
 */
function getChromeUserAgent(): string {
    const ua = app.userAgentFallback
    return ua
        .replace(/\s*Electron\/[\w.-]+/i, '')
        .replace(/\s*zalo-elec\/[\w.-]+/i, '')
}

/**
 * Tìm đường dẫn tới thư mục zadark-extension trong resources.
 * Hỗ trợ cả dev (chạy từ source) và production (đóng gói app).
 */
function getZaDarkExtensionPath(): string {
    // Trong production, app.isPackaged = true, resources nằm ngoài asar
    if (app.isPackaged) {
        return join(process.resourcesPath, 'resources', 'zadark-extension')
    }
    // Trong dev, chạy từ thư mục project
    return join(__dirname, '../../resources/zadark-extension')
}

async function createWindow() {
    // Giả lập Chrome UA trước khi tạo window
    const chromeUA = getChromeUserAgent()
    app.userAgentFallback = chromeUA

    // Load ZaDark extension vào session persist:zalo trước khi tạo window
    const ses = session.fromPartition('persist:zalo')

    try {
        const extPath = getZaDarkExtensionPath()
        const ext = await ses.extensions.loadExtension(extPath, {
            allowFileAccess: true,
        })
        console.log(`[ZaDark] Extension loaded: ${ext.name} v${ext.version}`)
    } catch (err) {
        console.error('[ZaDark] Failed to load extension:', err)
    }

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

    // Override User-Agent cho session persist:zalo
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = chromeUA
        callback({ requestHeaders: details.requestHeaders })
    })

    mainWindow.loadURL(ZALO_URL, { userAgent: chromeUA })

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

app.whenReady().then(async () => {
    await createWindow()
    createTray(mainWindow!)

    // Linux: re-show nếu click dock/taskbar
    app.on('activate', () => {
        if (!mainWindow?.isVisible()) mainWindow?.show()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
