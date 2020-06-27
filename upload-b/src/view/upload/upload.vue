<template>
  <div class="container">
    <div class="wrap" ref="drag">
      <input type="file" name="file"  multiple="multiple" @change="handleGetFile">
    </div>

    <div class="pro-wrap">
      <el-progress :text-inside="true" :stroke-width="50" :percentage="pernum"></el-progress>
    </div>

    <div class="btn-wrap">
      <el-button @click="handleUpload">上传</el-button>
    </div>


    <div class="pro-wrap">
      计算hash
      <el-progress :text-inside="true" :stroke-width="50" :percentage="hashProgress"></el-progress>
    </div>
  </div>
</template>

<script>
import uploadService from '@/api/';
import $http from '@/utils/http';
import sparkMD5 from 'spark-md5';

// 文件切片大小
const CHUNK_SIZE = 0.5 * 1024 * 1024;

export default {
  name: 'upload',
  data() {
    return {
      file: null,
      pernum: 0,
      worker: null,
      hashProgress: 0,
      chunks: [],
      hash: ''
    }
  },

  mounted() {
    this.bindEvent();
  },

  methods: {
    // 拖拽上传
    bindEvent() {
      const drag = this.$refs.drag;

      drag.addEventListener('dragover', e => {
        drag.style.borderColor = 'red';

        e.preventDefault();
      });

      drag.addEventListener('dragleave', e => {
        drag.style.borderColor = '#191919';

        e.preventDefault();
      });

      drag.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];

        this.file = file;

        if (file) drag.style.borderColor = 'green';


        e.preventDefault();
      });
    },

    // 二进制转换
    async blobToString(blob) {
      // FIleReader 读取文件流信息
      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = function() {
          const ret = reader.result.split('')
                      .map(v => v.charCodeAt())
                      .map(v => v.toString(16))
                      .join(' ')

          resolve(ret);
        }

        reader.readAsBinaryString(blob);
      })

    },

    // 判断gif
    async isGif(file) {
      // GIF89a 和 GIF87a
      // 前面6哥十六进制数字  47 49 46 38 39 61 和 47 49 46 38 37 61

      const ret = await this.blobToString(file.slice(0, 6));

      const isGif = (ret === '47 49 46 38 39 61') || (ret === '47 49 46 38 37 61');

      return isGif;
    },

    // 判断png
    async isPng(file) {
      const ret = await this.blobToString(file.slice(0, 8));

      const isPng = (ret === '89 50 4E 47 0D 0A 1A 0A');

      return isPng;
    },

    // 判断jpg
    async isJpg(file) {
      const len = file.size;

      const start = await this.blobToString(file.slice(0, 2));
      const end = await this.blobToString(file.slice(-2, len));

      const isJpg = (start === 'FF 08') && (end === 'FF D9');

      return isJpg;
    },

    // 限制文件格式
    isImange(file) {
      // 通过文件流判断

      return this.isGif(file) || this.isPng(file) || this.isJpg(file);
    },

    // 文件切片
    createFileChunk(file, size = CHUNK_SIZE) {
      const chunks = [];
      let cur = 0;

      while(cur < file.size) {
        chunks.push({
          index: cur,
          file: file.slice(cur, cur + size)
        });

        cur += size
      }

      return chunks;
    },

    // 计算md5
    async calculateHashWorker(chunks) {
      return new Promise((resolve) => {
        this.worker = new Worker('../../../static/md5/hash.js');

        this.worker.postMessage({ chunks });

        this.worker.onmessage = e => {
          const { progress, hash } = e.data;

          this.hashProgress = Number(progress.toFixed(2));

          if (hash) resolve(hash)
        }
      })
    },

    async calculateHashIdle(chunks) {
      return new Promise((resolve) => {
        const spark = new sparkMD5.ArrayBuffer();

        let count = 0;

        // 追加函数
        const appendToSpark = async file => {
          return new Promise((resolve) => {
            const reader = new FileReader();

            reader.readAsArrayBuffer(file);

            reader.onload = e => {
              spark.append(e.target.result);

              resolve()
            }
          })
        }

        const workLoop = async deadline => {
          while(count < chunks.length && deadline.timeRemaining() > 1) {
            // 空闲时间且有任务
            await appendToSpark(chunks[count].file);

            count++;

            if (count < chunks.length) {
              this.hashProgress = Number(
                ((100 * count )/ chunks.length).toFixed(2)
              )
            } else {
              this.hashProgress = 100;
              resolve(spark.end());
            }
          }
          window.requestIdleCallback(workLoop);
        }

        window.requestIdleCallback(workLoop);
      })
    },

    async upLoadChunks() {
      const request = this.chunks.map((chunk, index) => {
        const form = new FormData();

        form.append('chunk', chunk.chunk);
        form.append('name', chunk.name);
        form.append('hash', chunk.hash);
        // form.append('index', chunk.index);

        return form;
      }).map((form, index) => $http.post('/api/upload', form));
    },

    async handleUpload() {
      const isImange = await this.isImange(this.file);

      if (!isImange) return;

      // 文件切片
      const chunks = await this.createFileChunk(this.file);

      // 计算md5
      this.hash = await this.calculateHashWorker(chunks); // worker
      // const hash = await this.calculateHashIdle(chunks); // requestIdleCallback


      // 切片上传
      // 整理chunks
      this.chunks = chunks.map((chunk, index) => {
        // 切片名  hash + index

        const name = this.hash + '-' + index;

        return {
          hash: this.hash,
          name,
          index,
          chunk: chunk.file
        }
      });

      this.upLoadChunks();
    },

    handleGetFile(e) {
      const [ file ] = e.target.files;

      if (!file) return false;

      this.file = file;
    }
  }
}
</script>

<style  lang="scss" scoped>
  .container {
    margin-top: 100px;
    width: 100%;
    color: #000;
  }

  .wrap {
    height: 100px;
    text-align: center;
    line-height: 100px;
    margin: 0 32px;
    border: 2px dashed #191919;
  }

  .wrap:hover {
    border-color: red;
  }

  .pro-wrap {
    margin: 64px 32px;
  }

  .btn-wrap {
    margin-left: 32px;
  }
</style>
