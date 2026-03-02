import { DEFAULT_LOGO_DATA_URL } from '../../ui/alert/getDefautlLogo'

interface IconProps {
  style?: any
}

export function CloseIcon(props: IconProps) {
  return (
    <svg
      strokeWidth="0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      height="1em"
      width="1em"
      style={
        props.style
          ? { overflow: 'visible', fontSize: '22px', ...props.style }
          : { overflow: 'visible', fontSize: '22px' }
      }
    >
      <path d="m289.94 256 95-95A24 24 0 0 0 351 127l-95 95-95-95a24 24 0 0 0-34 34l95 95-95 95a24 24 0 1 0 34 34l95-95 95 95a24 24 0 0 0 34-34Z"></path>
    </svg>
  )
}

export function LeftIcon(props: IconProps) {
  return (
    <svg
      strokeWidth="0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 512"
      height="1em"
      width="1em"
      style={props.style ? { overflow: 'visible', ...props.style } : { overflow: 'visible' }}
    >
      <path d="M224 480c-8.188 0-16.38-3.125-22.62-9.375l-192-192c-12.5-12.5-12.5-32.75 0-45.25l192-192c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25L77.25 256l169.4 169.4c12.5 12.5 12.5 32.75 0 45.25C240.4 476.9 232.2 480 224 480z"></path>
    </svg>
  )
}

export function LogoIcon(props: IconProps) {
  return (
    <img
      draggable={false}
      src={DEFAULT_LOGO_DATA_URL}
      alt="Octez Connect logo"
      style={{
        width: '120px',
        height: '40px',
        objectFit: 'contain',
        ...(props.style ?? {})
      }}
    />
  )
}

export function QRCodeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
      <path d="M0 224h192V32H0v192zM64 96h64v64H64V96zm192-64v192h192V32H256zm128 128h-64V96h64v64zM0 480h192V288H0v192zm64-128h64v64H64v-64zm352-64h32v128h-96v-32h-32v96h-64V288h96v32h64v-32zm0 160h32v32h-32v-32zm-64 0h32v32h-32v-32z" />
    </svg>
  )
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg
      fill="currentColor"
      strokeWidth="0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      height="1em"
      width="1em"
      style={props.style ? { overflow: 'hidden', ...props.style } : { overflow: 'hidden' }}
    >
      <path
        d="M336 64h32a48 48 0 0 1 48 48v320a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V112a48 48 0 0 1 48-48h32"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <rect
        x="176"
        y="32"
        width="160"
        height="64"
        rx="26.13"
        ry="26.13"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </svg>
  )
}
