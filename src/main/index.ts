// src/main/index.ts
import { app, BrowserWindow, shell, session } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { createTray } from './tray'

const ZALO_URL = 'https://chat.zalo.me'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

// Đặt tên app hiển thị cho thông báo (Notifications) và OS
app.setName('Zalo')
app.setAppUserModelId('com.haminh7036.zalo')

app.on('before-quit', () => {
    isQuitting = true
})

/**
 * Removes "Electron/xxx" and the app name from the User-Agent string.
 * This ensures Zalo doesn't detect the application as an Electron-based environment,
 * enabling features like the QR code login page.
 * 
 * @returns {string} The modified Chrome-like User-Agent string.
 */
function getChromeUserAgent(): string {
    const ua = app.userAgentFallback
    const appName = app.getName()
    const nameRegex = new RegExp(`\\s*${appName}/[\\w.-]+`, 'i')

    return ua
        .replace(/\s*Electron\/[\w.-]+/i, '')
        .replace(nameRegex, '')
        .replace(/\s*zalo-elec\/[\w.-]+/i, '') // Safety check for old app name
}

/**
 * Resolves the absolute path to a resource file, handling both packaged 
 * and development environments.
 * 
 * @param {string} relativePath Path relative to the resources directory.
 * @returns {string} The absolute path to the resource.
 */
function getResourcePath(relativePath: string): string {
    return join(app.getAppPath(), relativePath)
}

/**
 * Injects ZaDark emoji styles and scripts into the provided web contents.
 * 
 * @param {Electron.WebContents} webContents The web contents to inject into.
 */
function injectZaDarkEmoji(webContents: Electron.WebContents) {
    try {
        const cssPath = getResourcePath('resources/emoji/reaction.css')
        const jsPath = getResourcePath('resources/emoji/zadark-reaction.min.js')
        const imgPath = getResourcePath('resources/emoji/zalo-emoji-md.png')

        const css = fs.readFileSync(cssPath, 'utf-8')
        const js = fs.readFileSync(jsPath, 'utf-8')
        const imgBase64 = fs.readFileSync(imgPath).toString('base64')
        const imgDataUri = `data:image/png;base64,${imgBase64}`

        webContents.insertCSS(css)
        webContents.executeJavaScript(`
            document.documentElement.setAttribute('data-zadark-emoji-url', '${imgDataUri}');
            ${js}
        `)
    } catch (err) {
        console.error('[Emoji Injector] Failed to inject emoji features:', err)
    }
}

/**
 * Checks if a URL belongs to Zalo's internal ecosystem.
 * 
 * @param {string} targetUrl The URL to check.
 * @returns {boolean} True if the URL is internal to Zalo, false otherwise.
 */
function isInternalZaloUrl(targetUrl: string) {
    if (targetUrl === 'about:blank') return true;
    try {
        const parsedUrl = new URL(targetUrl)
        // Define core internal domains that should stay within the app
        const internalHosts = ['chat.zalo.me', 'id.zalo.me', 'account.zalo.me']

        // Check if it's a sub-domain or related Zalo link (e.g., zalo.me/...)
        // but exclude non-app domains to force them to open in an external browser.
        if (parsedUrl.hostname === 'zalo.me' || parsedUrl.hostname.endsWith('.zalo.me')) {
            if (!internalHosts.includes(parsedUrl.hostname)) {
                return false
            }
        }

        return internalHosts.includes(parsedUrl.hostname)
    } catch (err) {
        return false
    }
}

/**
 * Creates the main application window and sets up web preferences, 
 * session headers, and event listeners.
 */
function createWindow() {
    // Spoof the User-Agent before creating the window to ensure it's applied early
    const chromeUA = getChromeUserAgent()
    app.userAgentFallback = chromeUA

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'Zalo',
        icon: join(__dirname, '../../resources/icon.png'),
        webPreferences: {
            contextIsolation: true, // Standard security practice
            sandbox: true,          // Restrict web wrapper's access to Node.js APIs
            partition: 'persist:zalo', // Separate session to persist login status
        },
        autoHideMenuBar: true,
    })

    // Force the spoofed User-Agent for the 'persist:zalo' partition
    const ses = session.fromPartition('persist:zalo')
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = chromeUA
        callback({ requestHeaders: details.requestHeaders })
    })

    mainWindow.loadURL(ZALO_URL, { userAgent: chromeUA })

    // Inject ZaDark emoji styles and scripts after the DOM is ready
    mainWindow.webContents.on('dom-ready', () => {
        injectZaDarkEmoji(mainWindow!.webContents)
    })

    // Automatically allow necessary permissions for a chat application
    mainWindow.webContents.session.setPermissionRequestHandler(
        (webContents, permission, callback) => {
            const allowed = ['notifications', 'media', 'microphone', 'camera']
            callback(allowed.includes(permission))
        }
    )

    // Prevent the app from quitting when the window is closed; hide it to tray instead.
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault()
            mainWindow?.hide()
        }
    })
}

// Global handler for navigation and new windows to ensure external links 
// open in the system's default browser.
app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        if (url === 'about:blank') return { action: 'allow' }

        if (!isInternalZaloUrl(url)) {
            shell.openExternal(url)
            return { action: 'deny' }
        }
        return { action: 'allow' }
    })

    contents.on('will-navigate', (event, url) => {
        if (!isInternalZaloUrl(url)) {
            event.preventDefault()
            shell.openExternal(url)
            // Close intermediary popup windows (e.g., about:blank redirects)
            if (mainWindow && contents.id !== mainWindow.webContents.id) {
                contents.close()
            }
        }
    })
})

// Ensure only one instance of the application is running
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        // Restore and focus the main window if a second instance is started
        mainWindow?.show()
        mainWindow?.focus()
    })
}

app.whenReady().then(() => {
    createWindow()
    createTray(mainWindow!)

    // On Linux, re-show the window if the dock or taskbar icon is clicked
    app.on('activate', () => {
        if (!mainWindow?.isVisible()) mainWindow?.show()
    })
})

// Standard Electron behavior: quit the app when all windows are closed, 
// except on macOS where apps typically stay active.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
