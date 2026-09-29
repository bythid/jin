// The stylesheet is a side-effect import — `import '@bythid/jin/styles.css'`
// brings CSS, not a binding. This declaration is the types answer for the
// `./styles.css` export. It lives at the package root (rather than next to
// the sheet in src/styles/) so that node10 resolution finds it too: node10
// does not read `exports` and probes `styles.css.d.ts` at this exact path.
export {}
