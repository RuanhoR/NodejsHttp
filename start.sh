echo -e "\n按 CTRL+C 退出"
while true; do
  node index.js
  exit_code=$?
  if [ -f "lib/data/exit.log" ] && 
     [ "$(tr -d '\n\r' < lib/data/exit.log)" = "Close" ]; then
    echo "成功退出"
    rm -f "lib/data/exit.log"
    break
  fi
  if [ $exit_code -ne 0 ]; then
    echo -e "\n⚠️ 进程异常退出 (代码: $exit_code)，3秒后重启..."
    sleep 3
  fi
done