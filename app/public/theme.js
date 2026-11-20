// Kept external so the production page needs no inline-script CSP exception.
(() => {
  const param = new URLSearchParams(window.location.search).get('clawpilotTheme')
  const preference = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => document.documentElement.setAttribute('data-theme',
    param === 'dark' || param === 'light' ? param : preference.matches ? 'dark' : 'light')
  apply()
  preference.addEventListener('change', apply)
})()
