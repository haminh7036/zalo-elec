// src/main/tray.ts
import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

/**
 * Creates and configures the system tray icon and context menu.
 * 
 * @param {BrowserWindow} win The main application window instance.
 */
export function createTray(win: BrowserWindow) {
    // Load the icon and resize it to standard tray dimensions
    const icon = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png'))
    tray = new Tray(icon.resize({ width: 16, height: 16 }))

    // Build the tray context menu
    const menu = Menu.buildFromTemplate([
        { label: 'Mở Zalo', click: () => win.show() },
        { type: 'separator' },
        { label: 'Thoát', click: () => { app.quit() } },
    ])

    tray.setContextMenu(menu)
    tray.setToolTip('Zalo')

    // Toggle window visibility when the tray icon is clicked
    tray.on('click', () => win.isVisible() ? win.hide() : win.show())
}