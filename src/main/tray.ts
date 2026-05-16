// src/main/tray.ts
import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function createTray(win: BrowserWindow) {
    const icon = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png'))
    tray = new Tray(icon.resize({ width: 16, height: 16 }))

    const menu = Menu.buildFromTemplate([
        { label: 'Mở Zalo', click: () => win.show() },
        { type: 'separator' },
        { label: 'Thoát', click: () => { (app as any).isQuitting = true; app.quit() } },
    ])

    tray.setContextMenu(menu)
    tray.setToolTip('Zalo')
    tray.on('click', () => win.isVisible() ? win.hide() : win.show())
}