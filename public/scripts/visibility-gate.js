/* Shared by Network.astro, Arena.astro, and Globe.astro's hand-rolled rAF
   loops — each pauses its own canvas work when the section scrolls
   off-screen or the tab goes hidden, previously via three copies of the
   same IntersectionObserver + visibilitychange wiring. All three are
   `is:inline` scripts (can't import an ES module), so this loads as a
   plain global instead. */
function midearthVisibilityGate(el, setVisible, threshold) {
  if (el && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        setVisible(entries[0].isIntersecting && !document.hidden);
      },
      { threshold: threshold == null ? 0.02 : threshold }
    ).observe(el);
  }
  document.addEventListener("visibilitychange", function () {
    setVisible(!document.hidden);
  });
}
