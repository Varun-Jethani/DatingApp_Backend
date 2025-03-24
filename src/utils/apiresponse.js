class ApiResponse {
  constructor(success, message = "success", data) {
    this.message = message;
    this.data = data;
    this.success = success < 400;
  }
}

export { ApiResponse };
