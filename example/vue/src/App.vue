<template>
  <div style="max-width: 800px; margin: 0 auto; padding: 20px">
    <h2>OFD Viewer — Vue</h2>

    <input
      type="file"
      accept=".ofd"
      @change="handleFile"
      :disabled="loading"
    />

    <p v-if="loading">Loading...</p>
    <p v-if="error" style="color: red">{{ error }}</p>

    <template v-if="ofd">
      <div style="margin: 12px 0; display: flex; align-items: center; gap: 12px">
        <button @click="goPrev" :disabled="pageIndex === 0">Prev</button>
        <span>
          Page {{ pageIndex + 1 }} / {{ pageCount }}
          <template v-if="dims">
            — {{ dims.width.toFixed(1) }}×{{ dims.height.toFixed(1) }} mm
          </template>
        </span>
        <button @click="goNext" :disabled="pageIndex >= pageCount - 1">Next</button>
      </div>

      <canvas ref="canvasRef" style="border: 1px solid #ccc; max-width: 100%" />
    </template>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { readOfd, renderPageToCanvas, getPageCount, getPageDimensions } from '@sharp9/ofdjs';

const ofd = ref(null);
const pageIndex = ref(0);
const pageCount = ref(0);
const dims = ref(null);
const loading = ref(false);
const error = ref(null);
const canvasRef = ref(null);

async function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  loading.value = true;
  error.value = null;

  try {
    const ofdData = await readOfd(file);
    const count = getPageCount(ofdData);
    const dimensions = await getPageDimensions(ofdData, 0);

    ofd.value = ofdData;
    pageCount.value = count;
    pageIndex.value = 0;
    dims.value = dimensions;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// Re-render when page index or ofd data changes
watch([ofd, pageIndex], async () => {
  if (!ofd.value) return;

  // Wait for Vue to finish DOM update so the canvas ref is available
  await nextTick();

  if (!canvasRef.value) return;

  try {
    const currentDims = await getPageDimensions(ofd.value, pageIndex.value);
    dims.value = currentDims;
    await renderPageToCanvas(ofd.value, pageIndex.value, canvasRef.value, { dpi: 150, scale: 1 });
  } catch (err) {
    error.value = err.message;
  }
});

function goPrev() {
  pageIndex.value = Math.max(0, pageIndex.value - 1);
}

function goNext() {
  pageIndex.value = Math.min(pageCount.value - 1, pageIndex.value + 1);
}
</script>
