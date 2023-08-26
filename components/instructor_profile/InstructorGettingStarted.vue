<template>
  <div v-bind="$attrs">
    <p class="text-lg font-medium">
      {{ $t("instructor_getting_started.header") }}
    </p>
    <p class="text-md">
      {{ $t("instructor_getting_started.infoline") }}
    </p>
    <div class="flex flex-row flex-wrap mt-4">
      <div
        class="video-item"
        v-for="video in TUT_VIDEOS"
        :key="video.title"
      >
        <iframe
          :src="video.src"
          width="300"
          height="150"
        />
        <p class="text-md font-medium mt-1 px-3">
          {{ video.title }}
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  const TUT_VIDEOS: { title: string; src: string }[] = [
    {
      title: 'LibreVerse 101 - Introduction to LibreTexts',
      src: 'https://www.youtube.com/embed/5WZq1ZxX7RY?si=2pURc3lyG3QoJxzP',
    },
    {
      title: 'Commons & Conductor - Your Portal to the LibreVerse',
      src: 'https://www.youtube.com/embed/AqXKMM41l8g?si=pcXzYwyr6MNNsNCY',
    },
    {
      title: 'ADAPT I',
      src: 'https://www.youtube.com/embed/Yx0_vu8-wA4?si=KKa1CJZetYi3tX9i',
    },
    {
      title: 'Building H5P Assessment in ADAPT and Studio Assessment Platforms',
      src: 'https://www.youtube.com/embed/srKCCyP83pE?si=B8LadfflHAC8KnG6',
    },
  ];
</script>

<style>
.video-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-items: center;
  text-align: center;
  width: 20rem;
  height: 15rem;
  padding: 0.5rem;
  margin-right: 1rem;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -2px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
.video-item:hover {
  box-shadow: 0 6px 10px 0px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
</style>
