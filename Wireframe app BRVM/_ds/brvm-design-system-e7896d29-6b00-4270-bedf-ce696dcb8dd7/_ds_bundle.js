/* @ds-bundle: {"format":4,"namespace":"BRVMDesignSystem_e7896d","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"8231c13d2eb4","components/core/Button.jsx":"0d19a82969dd","components/core/Card.jsx":"cdaee9e7c026","components/core/Icon.jsx":"b753ed236e6b","components/core/IconButton.jsx":"20e8667043d8","components/core/Tag.jsx":"28cc4db7d27f","components/feedback/Dialog.jsx":"0dad6c8ce2cb","components/feedback/Toast.jsx":"8417fd148d38","components/feedback/Tooltip.jsx":"f9088ef33f56","components/forms/Checkbox.jsx":"ececa990dd0e","components/forms/Input.jsx":"f4270b36d933","components/forms/Radio.jsx":"734e4a911e96","components/forms/Select.jsx":"e10f62d6914d","components/forms/Switch.jsx":"e392532c0d77","components/navigation/Tabs.jsx":"a4aa128d14e6","ui_kits/mobile-app/AlertsScreen.jsx":"081287b25f08","ui_kits/mobile-app/Chrome.jsx":"36bd82850a3f","ui_kits/mobile-app/NewsFeedScreen.jsx":"0a13cc86906a","ui_kits/mobile-app/OnboardingScreen.jsx":"d77ec0096f64","ui_kits/mobile-app/PortfolioScreen.jsx":"b10a27e2d79c","ui_kits/mobile-app/StockDetailScreen.jsx":"ec22ba877b78","ui_kits/mobile-app/data.js":"29af6b19a02e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.BRVMDesignSystem_e7896d = window.BRVMDesignSystem_e7896d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
const tones = {
  neutral: {
    bg: 'var(--gray-800)',
    fg: 'var(--text-secondary)'
  },
  success: {
    bg: 'var(--state-success-bg)',
    fg: 'var(--state-success-fg)'
  },
  error: {
    bg: 'var(--state-error-bg)',
    fg: 'var(--state-error-fg)'
  },
  warning: {
    bg: 'var(--state-warning-bg)',
    fg: 'var(--state-warning-fg)'
  },
  info: {
    bg: 'var(--state-info-bg)',
    fg: 'var(--state-info-fg)'
  }
};
function Badge({
  children,
  tone = 'neutral'
}) {
  const t = tones[tone] || tones.neutral;
  return React.createElement('span', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 9px',
      borderRadius: 'var(--radius-pill)',
      background: t.bg,
      color: t.fg,
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase'
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const sizes = {
  s: {
    padding: '8px 14px',
    font: 'var(--text-body-s)',
    radius: 'var(--radius-s)',
    height: 36
  },
  m: {
    padding: '11px 20px',
    font: 'var(--text-body)',
    radius: 'var(--radius-m)',
    height: 44
  },
  l: {
    padding: '15px 26px',
    font: 'var(--text-title)',
    radius: 'var(--radius-m)',
    height: 52
  }
};
const variants = {
  primary: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: '1px solid transparent'
  },
  secondary: {
    background: 'var(--action-secondary)',
    color: 'var(--action-secondary-text)',
    border: '1px solid var(--border-strong)'
  },
  outline: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid transparent'
  },
  danger: {
    background: 'var(--action-danger)',
    color: 'var(--text-primary)',
    border: '1px solid transparent'
  },
  success: {
    background: 'var(--market-up-500)',
    color: 'var(--gray-0)',
    border: '1px solid transparent'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'm',
  disabled = false,
  fullWidth = false,
  onClick
}) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.m;
  return React.createElement('button', {
    onClick: disabled ? undefined : onClick,
    disabled,
    style: {
      fontFamily: 'var(--font-body)',
      font: s.font,
      padding: s.padding,
      borderRadius: s.radius,
      background: v.background,
      color: v.color,
      border: v.border,
      width: fullWidth ? '100%' : 'auto',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      letterSpacing: 'var(--tracking-body)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      transition: 'background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)'
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({
  children,
  raised = false,
  padding = 16,
  onClick
}) {
  return React.createElement('div', {
    onClick,
    style: {
      background: raised ? 'var(--surface-card-raised)' : 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-l)',
      boxShadow: 'var(--shadow-s)',
      padding,
      cursor: onClick ? 'pointer' : 'default'
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
const {
  useEffect,
  useRef
} = React;
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 2
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      window.lucide.createIcons({
        nameAttr: 'data-lucide',
        attrs: {}
      });
    }
  });
  return React.createElement('i', {
    ref,
    'data-lucide': name,
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      color,
      strokeWidth
    }
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
const sizeMap = {
  s: 32,
  m: 40,
  l: 48
};
function IconButton({
  name,
  size = 'm',
  variant = 'ghost',
  onClick,
  ariaLabel
}) {
  const px = sizeMap[size] || 40;
  const isFilled = variant === 'filled';
  return React.createElement('button', {
    onClick,
    'aria-label': ariaLabel || name,
    style: {
      width: px,
      height: px,
      borderRadius: 'var(--radius-m)',
      background: isFilled ? 'var(--action-primary)' : 'transparent',
      border: isFilled ? 'none' : '1px solid var(--border-default)',
      color: isFilled ? 'var(--action-primary-text)' : 'var(--text-primary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, React.createElement(__ds_scope.Icon, {
    name,
    size: Math.round(px * 0.45)
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function Tag({
  children,
  active = false,
  onClick
}) {
  return React.createElement('button', {
    onClick,
    style: {
      padding: '7px 14px',
      borderRadius: 'var(--radius-pill)',
      background: active ? 'var(--market-up-500)' : 'transparent',
      color: active ? 'var(--gray-0)' : 'var(--text-secondary)',
      border: active ? '1px solid transparent' : '1px solid var(--border-default)',
      font: 'var(--text-body-s)',
      cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap'
    }
  }, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open,
  title,
  children,
  onClose,
  footer
}) {
  if (!open) return null;
  return React.createElement('div', {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-overlay)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)'
    }
  }, React.createElement('div', {
    style: {
      width: '100%',
      maxWidth: 480,
      background: 'var(--surface-card-raised)',
      borderTopLeftRadius: 'var(--radius-xl)',
      borderTopRightRadius: 'var(--radius-xl)',
      border: '1px solid var(--border-default)',
      borderBottom: 'none',
      boxShadow: 'var(--shadow-l)',
      padding: 20
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-title)',
      color: 'var(--text-primary)'
    }
  }, title), React.createElement(__ds_scope.IconButton, {
    name: 'x',
    size: 's',
    onClick: onClose,
    ariaLabel: 'Close'
  })), React.createElement('div', {
    style: {
      color: 'var(--text-secondary)',
      font: 'var(--text-body)'
    }
  }, children), footer && React.createElement('div', {
    style: {
      marginTop: 20,
      display: 'flex',
      gap: 10
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const tones = {
  neutral: {
    icon: 'info',
    color: 'var(--text-primary)'
  },
  success: {
    icon: 'check',
    color: 'var(--state-success-fg)'
  },
  error: {
    icon: 'x',
    color: 'var(--state-error-fg)'
  },
  warning: {
    icon: 'alert-triangle',
    color: 'var(--state-warning-fg)'
  }
};
function Toast({
  message,
  tone = 'neutral'
}) {
  const t = tones[tone] || tones.neutral;
  return React.createElement('div', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--surface-card-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-m)',
      boxShadow: 'var(--shadow-m)',
      padding: '12px 16px',
      fontFamily: 'var(--font-body)',
      font: 'var(--text-body-s)',
      color: 'var(--text-primary)'
    }
  }, React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 16,
    color: t.color
  }), message);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
const {
  useState
} = React;
function Tooltip({
  children,
  label
}) {
  const [show, setShow] = useState(false);
  return React.createElement('span', {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, children, show && React.createElement('span', {
    style: {
      position: 'absolute',
      bottom: '120%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--gray-0)',
      color: 'var(--text-inverse)',
      font: 'var(--text-caption)',
      padding: '6px 10px',
      borderRadius: 'var(--radius-s)',
      whiteSpace: 'nowrap',
      boxShadow: 'var(--shadow-m)',
      fontFamily: 'var(--font-body)',
      zIndex: 10
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false
}) {
  return React.createElement('label', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-body)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1
    }
  }, React.createElement('span', {
    onClick: disabled ? undefined : () => onChange && onChange(!checked),
    style: {
      width: 20,
      height: 20,
      borderRadius: 'var(--radius-s)',
      border: checked ? '1px solid transparent' : '1px solid var(--border-strong)',
      background: checked ? 'var(--action-primary)' : 'transparent',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, checked && React.createElement(__ds_scope.Icon, {
    name: 'check',
    size: 14,
    color: 'var(--action-primary-text)'
  })), label && React.createElement('span', {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
  disabled = false
}) {
  return React.createElement('label', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-body)'
    }
  }, label && React.createElement('span', {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, label), React.createElement('input', {
    type,
    placeholder,
    value,
    disabled,
    onChange: onChange ? e => onChange(e.target.value) : undefined,
    style: {
      font: 'var(--text-body)',
      padding: '12px 14px',
      borderRadius: 'var(--radius-m)',
      background: 'var(--surface-card)',
      border: `1px solid ${error ? 'var(--action-danger)' : 'var(--border-default)'}`,
      color: 'var(--text-primary)',
      outline: 'none',
      opacity: disabled ? 0.5 : 1
    }
  }), error && React.createElement('span', {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--state-error-fg)'
    }
  }, error));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function Radio({
  label,
  checked = false,
  onChange,
  disabled = false
}) {
  return React.createElement('label', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-body)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1
    }
  }, React.createElement('span', {
    onClick: disabled ? undefined : () => onChange && onChange(true),
    style: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      border: checked ? '1px solid var(--action-primary)' : '1px solid var(--border-strong)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, checked && React.createElement('span', {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: 'var(--action-primary)'
    }
  })), label && React.createElement('span', {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  value,
  onChange,
  options = []
}) {
  return React.createElement('label', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-body)'
    }
  }, label && React.createElement('span', {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, label), React.createElement('div', {
    style: {
      position: 'relative'
    }
  }, React.createElement('select', {
    value,
    onChange: onChange ? e => onChange(e.target.value) : undefined,
    style: {
      font: 'var(--text-body)',
      padding: '12px 40px 12px 14px',
      borderRadius: 'var(--radius-m)',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      color: 'var(--text-primary)',
      appearance: 'none',
      width: '100%'
    }
  }, options.map(o => React.createElement('option', {
    key: o.value,
    value: o.value
  }, o.label))), React.createElement('div', {
    style: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--text-tertiary)'
    }
  }, React.createElement(__ds_scope.Icon, {
    name: 'chevron-down',
    size: 16
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked = false,
  onChange,
  disabled = false
}) {
  return React.createElement('span', {
    onClick: disabled ? undefined : () => onChange && onChange(!checked),
    style: {
      display: 'inline-flex',
      width: 44,
      height: 26,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--market-up-500)' : 'var(--gray-300)',
      padding: 3,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--duration-fast) var(--ease-standard)'
    }
  }, React.createElement('span', {
    style: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: checked ? 'var(--gray-0)' : 'var(--gray-0)',
      transform: checked ? 'translateX(18px)' : 'translateX(0)',
      transition: 'transform var(--duration-fast) var(--ease-standard)'
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  active,
  onChange
}) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-body)'
    }
  }, tabs.map(t => React.createElement('button', {
    key: t.value,
    onClick: () => onChange && onChange(t.value),
    style: {
      padding: '10px 16px',
      font: 'var(--text-body)',
      color: active === t.value ? 'var(--text-primary)' : 'var(--text-tertiary)',
      borderBottom: active === t.value ? '2px solid var(--action-primary)' : '2px solid transparent',
      marginBottom: -1,
      cursor: 'pointer'
    }
  }, t.label)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/AlertsScreen.jsx
try { (() => {
function AlertsScreen() {
  const {
    Badge,
    Card,
    Switch,
    Button,
    Dialog,
    Input,
    Select,
    Toast
  } = window.BRVMDesignSystem_e7896d;
  const [alerts, setAlerts] = React.useState(window.BRVM_DATA.alerts);
  const [open, setOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  function toggle(i) {
    setAlerts(a => a.map((al, idx) => idx === i ? {
      ...al,
      enabled: !al.enabled
    } : al));
  }
  function save() {
    setOpen(false);
    setToast('Alert created');
    setTimeout(() => setToast(null), 2200);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(window.TopBar, {
    title: "Alerts"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 20px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, alerts.map((a, i) => /*#__PURE__*/React.createElement(Card, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-title)',
      color: 'var(--text-primary)'
    }
  }, a.ticker), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-s)',
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, a.condition, " ", a.target.toLocaleString())), /*#__PURE__*/React.createElement(Switch, {
    checked: a.enabled,
    onChange: () => toggle(i)
  })))), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    fullWidth: true,
    onClick: () => setOpen(true)
  }, "+ Set alert")), /*#__PURE__*/React.createElement(Dialog, {
    open: open,
    title: "Set alert",
    onClose: () => setOpen(false),
    footer: /*#__PURE__*/React.createElement(Button, {
      variant: "success",
      fullWidth: true,
      onClick: save
    }, "Save")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "Stock",
    options: window.BRVM_DATA.stocks.map(s => ({
      value: s.ticker,
      label: `${s.ticker} — ${s.name}`
    }))
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Condition",
    options: [{
      value: 'above',
      label: 'Price above'
    }, {
      value: 'below',
      label: 'Price below'
    }]
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Target price",
    placeholder: "e.g. 13000"
  }))), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 16,
      left: 20,
      right: 20,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: "success",
    message: toast
  })));
}
window.AlertsScreen = AlertsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/AlertsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/Chrome.jsx
try { (() => {
function NavBar({
  active,
  onNavigate
}) {
  const items = [{
    key: 'news',
    name: 'newspaper',
    label: 'News'
  }, {
    key: 'portfolio',
    name: 'briefcase',
    label: 'Portfolio'
  }, {
    key: 'alerts',
    name: 'bell',
    label: 'Alerts'
  }, {
    key: 'settings',
    name: 'settings',
    label: 'Settings'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 64,
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--surface-canvas)',
      flexShrink: 0
    }
  }, items.map(it => /*#__PURE__*/React.createElement("div", {
    key: it.key,
    onClick: () => onNavigate(it.key),
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      cursor: 'pointer',
      color: active === it.key ? 'var(--action-primary)' : 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(window.BRVMDesignSystem_e7896d.Icon, {
    name: it.name,
    size: 20,
    color: active === it.key ? 'var(--action-primary)' : 'var(--text-tertiary)'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-caption)'
    }
  }, it.label))));
}
function TopBar({
  title
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 20px 12px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-display-s)',
      letterSpacing: 'var(--tracking-display)',
      textTransform: 'uppercase',
      color: 'var(--text-primary)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(window.BRVMDesignSystem_e7896d.IconButton, {
    name: "search",
    size: "s",
    ariaLabel: "Search"
  }), /*#__PURE__*/React.createElement(window.BRVMDesignSystem_e7896d.IconButton, {
    name: "bell",
    size: "s",
    ariaLabel: "Notifications"
  })));
}
window.NavBar = NavBar;
window.TopBar = TopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/Chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/NewsFeedScreen.jsx
try { (() => {
function NewsFeedScreen({
  onOpenStock
}) {
  const {
    Badge,
    Card,
    Tag
  } = window.BRVMDesignSystem_e7896d;
  const {
    composite,
    stocks,
    news
  } = window.BRVM_DATA;
  const [filter, setFilter] = React.useState('All');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement(window.TopBar, {
    title: "News"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 20px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, "BRVM Composite"), /*#__PURE__*/React.createElement(Badge, {
    tone: composite.change >= 0 ? 'success' : 'error'
  }, composite.change >= 0 ? '+' : '', composite.change, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-mono-l)',
      color: 'var(--text-primary)',
      marginTop: 6
    }
  }, composite.value.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      overflowX: 'auto'
    }
  }, stocks.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.ticker,
    onClick: () => onOpenStock(s),
    style: {
      minWidth: 110,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-m)',
      padding: 12,
      cursor: 'pointer',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      color: 'var(--text-primary)'
    }
  }, s.ticker), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-mono)',
      color: s.change >= 0 ? 'var(--market-up-500)' : 'var(--market-down-500)',
      marginTop: 6
    }
  }, s.change >= 0 ? '+' : '', s.change, "%")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, ['All', 'Markets', 'Earnings', 'Banking', 'Energy'].map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t,
    active: filter === t,
    onClick: () => setFilter(t)
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, news.filter(n => filter === 'All' || n.tag === filter).map((n, i) => /*#__PURE__*/React.createElement(Card, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, n.img && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 'var(--radius-s)',
      background: 'linear-gradient(135deg, var(--gray-700), var(--gray-900))',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)'
    }
  }, n.tag, " \xB7 ", n.time), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-primary)'
    }
  }, n.title))))))));
}
window.NewsFeedScreen = NewsFeedScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/NewsFeedScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/OnboardingScreen.jsx
try { (() => {
function OnboardingScreen({
  onDone
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 28px 40px',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-display-xl)',
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--text-primary)'
    }
  }, "BRVM"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-display-m)',
      letterSpacing: 'var(--tracking-display)',
      textTransform: 'uppercase',
      color: 'var(--text-primary)',
      marginTop: 12
    }
  }, "Stay on the market."), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-l)',
      color: 'var(--text-secondary)',
      marginTop: 12,
      maxWidth: 300
    }
  }, "News, alerts, and your portfolio \u2014 never miss a move.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(window.BRVMDesignSystem_e7896d.Button, {
    variant: "primary",
    size: "l",
    fullWidth: true,
    onClick: onDone
  }, "Get started"), /*#__PURE__*/React.createElement(window.BRVMDesignSystem_e7896d.Button, {
    variant: "ghost",
    size: "l",
    fullWidth: true,
    onClick: onDone
  }, "I already have an account")));
}
window.OnboardingScreen = OnboardingScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/OnboardingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/PortfolioScreen.jsx
try { (() => {
function PortfolioScreen() {
  const {
    Badge,
    Card
  } = window.BRVMDesignSystem_e7896d;
  const {
    value,
    change,
    holdings
  } = window.BRVM_DATA.portfolio;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement(window.TopBar, {
    title: "Portfolio"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 20px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    raised: true,
    padding: 20
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, "Total value"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-display-m)',
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--text-primary)',
      marginTop: 6
    }
  }, value.toLocaleString(), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-body-s)',
      color: 'var(--text-tertiary)'
    }
  }, "XOF")), /*#__PURE__*/React.createElement(Badge, {
    tone: change >= 0 ? 'success' : 'error'
  }, change >= 0 ? '+' : '', change, "% today")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, "Holdings"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, holdings.map(h => /*#__PURE__*/React.createElement(Card, {
    key: h.ticker
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-title)',
      color: 'var(--text-primary)'
    }
  }, h.ticker), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-s)',
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, h.shares.toLocaleString(), " shares")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-mono)',
      color: 'var(--text-primary)'
    }
  }, h.value.toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body-s)',
      color: h.change >= 0 ? 'var(--market-up-500)' : 'var(--market-down-500)',
      marginTop: 4
    }
  }, h.change >= 0 ? '+' : '', h.change, "%"))))))));
}
window.PortfolioScreen = PortfolioScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/PortfolioScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/StockDetailScreen.jsx
try { (() => {
function StockDetailScreen({
  stock,
  onBack
}) {
  const {
    Badge,
    Button,
    IconButton
  } = window.BRVMDesignSystem_e7896d;
  if (!stock) return null;
  const up = stock.change >= 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '18px 20px 8px'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    name: "chevron-right",
    size: "s",
    onClick: onBack,
    ariaLabel: "Back"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase'
    }
  }, "Back to news")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '12px 20px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-display-l)',
      letterSpacing: 'var(--tracking-display)',
      textTransform: 'uppercase',
      color: 'var(--text-primary)'
    }
  }, stock.ticker), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-body)',
      color: 'var(--text-secondary)'
    }
  }, stock.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-mono-l)',
      color: 'var(--text-primary)',
      fontSize: 32
    }
  }, stock.price.toLocaleString()), /*#__PURE__*/React.createElement(Badge, {
    tone: up ? 'success' : 'error'
  }, up ? '+' : '', stock.change, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 140,
      borderRadius: 'var(--radius-l)',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-tertiary)',
      font: 'var(--text-body-s)'
    }
  }, "Price chart placeholder"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true
  }, "Set alert"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    fullWidth: true
  }, "Add to watchlist"))));
}
window.StockDetailScreen = StockDetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/StockDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/data.js
try { (() => {
window.BRVM_DATA = {
  composite: {
    value: 198.42,
    change: 1.8
  },
  stocks: [{
    ticker: 'SNTS',
    name: 'Sonatel',
    price: 12500,
    change: 4.2
  }, {
    ticker: 'BOAB',
    name: 'Bank of Africa',
    price: 6100,
    change: -1.1
  }, {
    ticker: 'ETIT',
    name: 'Ecobank',
    price: 18,
    change: 0.3
  }, {
    ticker: 'ORGT',
    name: 'Orange CI',
    price: 8900,
    change: 2.6
  }, {
    ticker: 'SGBC',
    name: 'SGB Cote d\'Ivoire',
    price: 25000,
    change: -0.4
  }],
  news: [{
    tag: 'Markets',
    title: 'Composite closes up 1.8% on banking rally',
    time: '2h',
    img: true
  }, {
    tag: 'Earnings',
    title: 'Sonatel Q2 profit beats forecasts',
    time: '4h'
  }, {
    tag: 'Banking',
    title: 'Ecobank announces regional expansion',
    time: '6h'
  }, {
    tag: 'Energy',
    title: 'Regional energy stocks slip on rate concerns',
    time: '1d'
  }],
  alerts: [{
    ticker: 'SNTS',
    condition: 'Above',
    target: 13000,
    enabled: true
  }, {
    ticker: 'BOAB',
    condition: 'Below',
    target: 5800,
    enabled: true
  }, {
    ticker: 'ORGT',
    condition: 'Above',
    target: 9200,
    enabled: false
  }],
  portfolio: {
    value: 4820000,
    change: 3.4,
    holdings: [{
      ticker: 'SNTS',
      shares: 120,
      value: 1500000,
      change: 4.2
    }, {
      ticker: 'BOAB',
      shares: 300,
      value: 1830000,
      change: -1.1
    }, {
      ticker: 'ETIT',
      shares: 5000,
      value: 90000,
      change: 0.3
    }, {
      ticker: 'ORGT',
      shares: 160,
      value: 1400000,
      change: 2.6
    }]
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
