import { contextBridge } from 'electron'

const api = {}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
