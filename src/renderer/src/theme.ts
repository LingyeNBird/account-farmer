import { Badge, createTheme } from '@mantine/core'

export const theme = createTheme({
  fontFamily:
    '"Segoe UI Variable Text", "Segoe UI", "MiSans", "HarmonyOS Sans SC", "Microsoft YaHei UI", sans-serif',
  primaryColor: 'indigo',
  defaultRadius: 'md',
  components: {
    Badge: Badge.extend({
      defaultProps: {
        size: 'lg',
        fw: 500,
        tt: 'none'
      }
    })
  }
})
