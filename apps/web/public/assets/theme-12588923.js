// El modo oscuro antes de la primera pintura (E3, docs/visual.md §3.3, D-00i y 3-h). Su nombre lleva la
// huella de su contenido: si cambia, cambia el nombre (theme.test.ts) y el de index.html.
try {
  if (localStorage.getItem('cs-theme') === 'dark') document.documentElement.dataset.theme = 'dark'
} catch {
  // sin almacenamiento, el claro
}
