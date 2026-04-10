
import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export function getFormKitValue(name: string, node: any): any {
  const rootNode = getFormKitRootNode(node)
  if (!rootNode) return undefined
  return rootNode.find(name)?.value;
}

export function useFormKitValue(name: string, node: any): Ref<any> {
  const value = ref<any>(undefined)
  let cleanup: (() => void) | null = null

  onMounted(() => {
    const targetNode = getFormKitRootNode(node)?.find(name)
    if (!targetNode) return
    value.value = targetNode.value
    const receipt = targetNode.on('commit', ({ payload }: { payload: unknown }) => {
      value.value = payload
    })
    cleanup = () => targetNode.off(receipt)
  })

  onUnmounted(() => cleanup?.())
  return value
}

export function getFormKitRootNode(node: any): any {
  if (node?.parent == null) return node
  return getFormKitRootNode(node?.parent)
}