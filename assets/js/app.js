/* Giao diện v1: không có dữ liệu được xác minh nên mọi thao tác xuất prompt đều bị khóa. */
document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', () => {
    // Nút đang disabled; handler này giữ rõ ý định cho giai đoạn tích hợp dữ liệu sau.
  });
});
