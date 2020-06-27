import $http from '@/utils/http';

export default class upLoadService {
  static upload(params, fn) {
    return $http.post('/api/upload', params);
  }
}
