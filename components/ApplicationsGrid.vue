<template>
  <div>
    <ul class="lg:columns-2">
      <li
        v-for="app in APPS"
        :key="app.key"
        :class="['flex', 'items-center', 'h-14', 'mb-2', 'p-2', 'rounded-sm', 'border', app.borderClass, app.bgClass, app.textClass ? app.textClass : 'text-black']"
      >
        <a
          :href="app.link"
          class="flex items-center flex-1"
        >
          <div class="w-8 h-8 flex items-center justify-center bg-white rounded-full">
            <img
              :src="app.icon"
              class="w-[80%]"
              alt=""
            >
          </div>
          <span class="ml-2">{{ app.title }}</span>
        </a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
  const APPS = [
    {
      key: 'adapt',
      title: 'ADAPT Homework System',
      link: 'https://adapt.libretexts.org',
      bgClass: 'bg-[#0060BC]',
      borderClass: 'border-[#0060BC]',
      textClass: 'text-white',
      icon: 'https://cdn.libretexts.net/Logos/libretexts_icon.png',
    },
    {
      key: 'commons',
      title: 'LibreCommons and Conductor',
      link: 'https://commons.libretexts.org',
      bgClass: 'bg-[#00BFB4]',
      borderClass: 'border-[#00BFB4]',
      icon: 'https://cdn.libretexts.net/Logos/libretexts_icon.png',
    },
    {
      key: 'studio',
      title: 'Studio',
      link: 'https://studio.libretexts.org',
      bgClass: 'bg-[#B94FAE]',
      borderClass: 'border-[#B94FAE]',
      textClass: 'text-white',
      icon: 'https://cdn.libretexts.net/Logos/libretexts_icon.png',
    },
    {
      key: 'bio',
      title: 'Biology',
      link: 'https://bio.libretexts.org',
      bgClass: 'bg-[#00B224]',
      borderClass: 'border-[#00B224]',
      icon: 'https://cdn.libretexts.net/Logos/bio_icon.png',
    },
    {
      key: 'biz',
      title: 'Business',
      link: 'https://biz.libretexts.org',
      bgClass: 'bg-[#207537]',
      borderClass: 'border-[#207537]',
      textClass: 'text-white',
      icon: 'https://cdn.libretexts.net/Logos/biz_icon.png',
    },
    {
      key: 'chem',
      title: 'Chemistry',
      link: 'https://chem.libretexts.org',
      bgClass: 'bg-[#00BFFF]',
      borderClass: 'border-[#00BFFF]',
      icon: 'https://cdn.libretexts.net/Logos/chem_icon.png',
    },
    {
      key: 'eng',
      title: 'Engineering',
      link: 'https://eng.libretexts.org',
      bgClass: 'bg-[#FF6A00]',
      borderClass: 'border-[#FF6A00]',
      icon: 'https://cdn.libretexts.net/Logos/eng_icon.png',
    },
    {
      key: 'espanol',
      title: 'Español',
      link: 'https://espanol.libretexts.org',
      bgClass: 'bg-[#D77B00]',
      borderClass: 'border-[#D77B00]',
      textClass: 'text-white',
      icon: 'https://cdn.libretexts.net/Logos/espanol_icon.png',
    },
    {
      key: 'geo',
      title: 'Geosciences',
      link: 'https://geo.libretexts.org',
      bgClass: 'bg-[#E5A800]',
      borderClass: 'border-[#E5A800]',
      icon: 'https://cdn.libretexts.net/Logos/geo_icon.png',
    },
    {
      key: 'human',
      title: 'Humanities',
      link: 'https://human.libretexts.org',
      bgClass: 'bg-[#00BC94]',
      borderClass: 'border-[#00BC94]',
      icon: 'https://cdn.libretexts.net/Logos/human_icon.png',
    },
    {
      key: 'k12',
      title: 'K12 Education',
      link: 'https://k12.libretexts.org',
      bgClass: 'bg-[#5CBF1C]',
      borderClass: 'border-[#5CBF1C]',
      icon: 'https://cdn.libretexts.net/Logos/k12_icon.png',
    },
    {
      key: 'math',
      title: 'Mathematics',
      link: 'https://math.libretexts.org',
      bgClass: 'bg-[#3737BF]',
      borderClass: 'border-[#3737BF]',
      textClass: 'text-white',
      icon: 'https://cdn.libretexts.net/Logos/math_icon.png',
    },
    {
      key: 'med',
      title: 'Medicine',
      link: 'https://med.libretexts.org',
      bgClass: 'bg-[#E52817]',
      borderClass: 'border-[#E52817]',
      textClass: 'text-white',
      icon: 'https://cdn.libretexts.net/Logos/med_icon.png',
    },
    {
      key: 'phys',
      title: 'Physics',
      link: 'https://phys.libretexts.org',
      bgClass: 'bg-[#841FCC]',
      borderClass: 'border-[#841FCC]',
      textClass: 'text-white',
      icon: 'https://cdn.libretexts.net/Logos/phys_icon.png',
    },
    {
      key: 'socialsci',
      title: 'Social Sciences',
      link: 'https://socialsci.libretexts.org',
      bgClass: 'bg-[#F20C92]',
      borderClass: 'border-[#F20C92]',
      textClass: 'text-white',
      icon: 'https://cdn.libretexts.net/Logos/socialsci_icon.png',
    },
    {
      key: 'stats',
      title: 'Statistics',
      link: 'https://stats.libretexts.org',
      bgClass: 'bg-[#05BAFF]',
      borderClass: 'border-[#05BAFF]',
      icon: 'https://cdn.libretexts.net/Logos/stats_icon.png',
    },
    {
      key: 'ukrayinska',
      title: 'Ukrayinska',
      link: 'https://ukrayinska.libretexts.org',
      bgClass: 'bg-[#FFD500]',
      borderClass: 'border-[#FFD500]',
      icon: 'https://cdn.libretexts.net/Logos/ukrayinska_icon.png',
    },
    {
      key: 'workforce',
      title: 'Workforce',
      link: 'https://workforce.libretexts.org',
      bgClass: 'bg-[#BF4000]',
      borderClass: 'border-[#BF4000]',
      textClass: 'text-white',
      icon: 'https://cdn.libretexts.net/Logos/workforce_icon.png',
    },
  ];

</script>