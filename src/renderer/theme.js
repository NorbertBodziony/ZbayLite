import '../renderer/fonts/app.scss'
import { createMuiTheme } from '@material-ui/core/styles'

const font = "'Rubik', sans-serif"

export default createMuiTheme({
  typography: {
    fontFamily: [
      font
    ].join(','),
    useNextVariants: true,
    caption: {
      color: '#b2b2b2',
      fontSize: '0.71rem'
    },
    subtitle1: {
      fontSize: '1.2rem'
    }
  },
  palette: {
    primary: {
      light: '#e9e9e9',
      main: '#8d8d8d',
      dark: '#4a4a4a'
    },
    colors: {
      blue: '#2196f3',
      white: '#FFFFFF',
      purple: '#521C74',
      darkPurple: '#4d1a6d',
      gray: '#e7e7e7',
      black: '#333333',
      trueBlack: '#000000',
      zbayBlue: '#521c74',
      darkGray: '#7F7F7F',
      lushSky: '#67BFD3',
      lightGray: '#B2B2B2',
      veryLightGray: '#F0F0F0'
    }
  },
  overrides: {
    MuiSnackbarContent: {
      root: {
        wordBreak: 'break-all'
      }
    },
    MuiButton: {
      sizeSmall: {
        textTransform: 'none',
        boxShadow: 'none',
        paddingLeft: '16px',
        paddingRight: '14px',
        fontWeight: 400,
        fontSize: '14px',
        '&:active': {
          boxShadow: 'none'
        }
      },
      sizeLarge: {
        textTransform: 'none',
        boxShadow: 'none',
        fontWeight: 400,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 14,
        '&:active': {
          boxShadow: 'none'
        }
      }
    },
    MuiOutlinedInput: {
      input: {
        paddingTop: 20,
        paddingBottom: 20
      }
    },
    MuiPopover: {
      paper: {
        borderRadius: 8
      }
    }
  }
})
