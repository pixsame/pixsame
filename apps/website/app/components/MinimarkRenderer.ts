import { defineComponent, h, type PropType, type VNode } from 'vue';

// Minimal renderer for Nuxt Content's minimark AST. Used for the changelog, where the
// generated release notes are plain headings, lists, links and inline code, so we skip the
// heavier MDC pipeline (whose heading anchors caused hydration mismatches on this page).
type Node = string | [string, Record<string, unknown>, ...Node[]];

const render = (node: Node, key?: number): VNode | string => {
  if (typeof node === 'string') return node;
  const [tag, props, ...children] = node;
  const attrs: Record<string, unknown> = { ...props, key };
  if (
    tag === 'a' &&
    typeof props.href === 'string' &&
    /^https?:/.test(props.href)
  )
    attrs.rel = 'noopener';
  return h(
    tag,
    attrs,
    children.map((c, i) => render(c, i)),
  );
};

export default defineComponent({
  name: 'MinimarkRenderer',
  props: { nodes: { type: Array as PropType<Node[]>, required: true } },
  setup: (props) => () => props.nodes.map((n, i) => render(n, i)),
});
