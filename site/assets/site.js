const currentPath = new URL(window.location.href).pathname.replace(/index\.html$/, '');

for (const link of document.querySelectorAll('nav a[href]')) {
  const linkPath = new URL(link.href).pathname.replace(/index\.html$/, '');
  if (linkPath === currentPath) link.setAttribute('aria-current', 'page');
}
