export default defineBackground({
  type: 'module',
  main() {
    // Non-persistent MV3 service worker: no state kept in memory here.
  },
});
