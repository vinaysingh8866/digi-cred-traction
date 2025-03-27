<template>
  <div class="surface-section px-3 py-4 md:px-4 lg:px-6">
    <!-- Debug Banner - More compact -->
    <div class="p-2 bg-blue-50 border-l-4 border-blue-500 text-blue-800 mb-3 rounded shadow-sm text-sm">
      <div class="flex items-center">
        <i class="pi pi-info-circle mr-2"></i>
        <span>{{ apiStatus }}</span>
      </div>
    </div>
    
    <!-- Logo and Title Section - More compact -->
    <div class="text-center mb-3">
      <div class="center-boxed mb-1">
        <div class="img-holder">
          <img src="/img/digicred/CrMS.svg" alt="CrMS Logo" class="w-full" />
        </div>
      </div>
      <h1 class="text-2xl font-bold text-blue-800 mb-1">DigiCred CrMS</h1>
      <p class="text-gray-600 text-sm">Secure Credential Management System</p>
    </div>
    
    <!-- Main Stats Dashboard - More compact -->
    <div class="bg-white rounded-lg shadow-sm p-4 mb-3">
      <h2 class="text-lg font-semibold mb-2 text-gray-800 border-b pb-1">Wallet Dashboard</h2>
      
      <!-- Stats Overview Cards - More compact grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
        <!-- Total Items Card -->
        <div class="bg-gray-50 rounded p-3 border border-gray-200 shadow-sm flex flex-col justify-between">
          <span class="text-gray-500 font-medium text-sm">Total Items</span>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold text-gray-800">{{ totalItems }}</span>
            <i class="pi pi-database text-xl text-gray-400"></i>
          </div>
        </div>
        
        <!-- Individual Item Type Cards -->
        <div 
          v-for="item in summary" 
          :key="item.kind_id" 
          class="rounded p-3 border shadow-sm flex flex-col justify-between"
          :class="{
            'bg-blue-50 border-blue-200': item.kind === 'Credential',
            'bg-green-50 border-green-200': item.kind === 'Connection',
            'bg-purple-50 border-purple-200': item.kind === 'Key',
            'bg-yellow-50 border-yellow-200': item.kind === 'Message',
            'bg-gray-50 border-gray-200': !['Credential', 'Connection', 'Key', 'Message'].includes(item.kind)
          }"
        >
          <span class="font-medium text-sm" 
                :class="{
                  'text-blue-600': item.kind === 'Credential',
                  'text-green-600': item.kind === 'Connection',
                  'text-purple-600': item.kind === 'Key',
                  'text-yellow-600': item.kind === 'Message',
                  'text-gray-600': !['Credential', 'Connection', 'Key', 'Message'].includes(item.kind)
                }">
            {{ item.kind }}
          </span>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold"
                  :class="{
                    'text-blue-700': item.kind === 'Credential',
                    'text-green-700': item.kind === 'Connection',
                    'text-purple-700': item.kind === 'Key',
                    'text-yellow-700': item.kind === 'Message',
                    'text-gray-700': !['Credential', 'Connection', 'Key', 'Message'].includes(item.kind)
                  }">
              {{ item.count }}
            </span>
            <i :class="{
                 'pi pi-id-card text-blue-400': item.kind === 'Credential',
                 'pi pi-link text-green-400': item.kind === 'Connection',
                 'pi pi-key text-purple-400': item.kind === 'Key',
                 'pi pi-envelope text-yellow-400': item.kind === 'Message',
                 'pi pi-file text-gray-400': !['Credential', 'Connection', 'Key', 'Message'].includes(item.kind)
               }"
               class="text-xl">
            </i>
          </div>
        </div>
      </div>
      
      <!-- Wallet Health Status + Activity merged into one line -->
      <div class="flex flex-col sm:flex-row justify-between">
        <div class="p-2 rounded-lg bg-green-50 border border-green-200 flex items-center mb-2 sm:mb-0">
          <i class="pi pi-check-circle text-green-500 mr-2"></i>
          <span class="text-green-800 text-sm">Wallet in healthy state</span>
        </div>
        
        <div v-if="summary.some(item => item.kind === 'Credential' && item.count > 0)" class="flex items-center text-blue-800 p-2">
          <i class="pi pi-check mr-2"></i>
          <span class="text-sm">{{ summary.find(item => item.kind === 'Credential').count }} verified credentials</span>
        </div>
      </div>
      
      <!-- Last updated info -->
      <div class="text-center mt-2 pt-2 border-t text-gray-500 text-xs">
        Last refreshed: {{ new Date().toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
// Import the API service if it exists
// import ApiService from '../services/ApiService';

export default {
  data() {
    return {
      apiStatus: 'Loading wallet data...',
      summary: []
    };
  },
  mounted() {
    console.log('Dashboard component mounted');
    this.fetchSummaryData();
  },
  methods: {
    async fetchSummaryData() {
      try {
        const response = await axios.get('/api/items/summary');
        this.summary = response.data;
        console.log('Dashboard: Summary data received:', this.summary);
        
        // Update API status with credential count
        const credentialItem = this.summary.find(item => item.kind === 'Credential');
        if (credentialItem) {
          this.apiStatus = `Found ${credentialItem.count} Credentials, ${this.totalItems} total items`;
        } else {
          this.apiStatus = `Found ${this.totalItems} total items`;
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error);
        this.apiStatus = `Error fetching summary: ${error.message}`;
      }
    }
  },
  computed: {
    totalItems() {
      return this.summary.reduce((total, item) => total + item.count, 0);
    }
  }
};
</script>

<style>
.center-boxed {
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-holder {
  width: 120px;  /* Reduced from 200px */
  height: 120px; /* Reduced from 200px */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Add responsive padding adjustments */
@media (max-width: 640px) {
  .surface-section {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  
  .img-holder {
    width: 100px;
    height: 100px;
  }
}
</style>
