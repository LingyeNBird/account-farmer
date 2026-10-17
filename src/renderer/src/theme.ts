import { Badge, createTheme } from '@mantine/core'

export const theme = createTheme({
  fontFamily:
    '"Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI Light", "Microsoft YaHei UI", sans-serif',
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
