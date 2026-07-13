// The DS Icon component drives lucide.createIcons(), which replaces the <i>
// node with a DOM-inserted <svg> outside React's control — this crashes React
// reconciliation once more than a couple of icons are mounted at once.
// Fix: redefine Icon as a plain React component rendering small inline SVGs
// (same visual language as lucide: 24x24, round caps, stroke=currentColor),
// for just the icon names this design actually uses.
(function () {
  var PATHS = {
    'telescope': '<path d="M10.065 12.493 3.31 15.686a1 1 0 0 1-1.35-1.24l3.44-9.375a1 1 0 0 1 1.211-.626l12.35 3.702"/><path d="m19.5 9.5-3.475 8.938a1 1 0 0 1-1.211.625l-2.612-.783"/><circle cx="11.5" cy="12" r="2"/><path d="M22 17v.5a2.5 2.5 0 0 1-5 0V17"/>',
    'bell': '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    'lock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'home': '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6.001a2 2 0 0 1 2.582 0l7 6.001A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    'briefcase': '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 12h20"/>',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  };
  function Icon(props) {
    var React = window.React;
    var name = props.name;
    var size = props.size || 20;
    var color = props.color || 'currentColor';
    var strokeWidth = props.strokeWidth || 2;
    var inner = PATHS[name] || '';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth +
      '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
    return React.createElement('span', {
      style: { display: 'inline-flex', width: size, height: size, color: color, flexShrink: 0 },
      dangerouslySetInnerHTML: { __html: svg },
    });
  }
  // The DS bundle script loads/executes asynchronously relative to this file
  // (helmet scripts are not guaranteed to run in source order), so it can
  // overwrite Icon *after* we patch it. Keep re-applying the patch for a few
  // seconds so ours always wins the race, regardless of load order.
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (window.BRVMDesignSystem_e7896d) {
      window.BRVMDesignSystem_e7896d.Icon = Icon;
    }
    if (tries > 100) clearInterval(timer);
  }, 30);
})();
