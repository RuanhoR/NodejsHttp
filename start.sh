cb=("node" "npm")
for pkg in "${cb[@]}"; do
  if command -v "$pkg"; then
    echo "$pkg is installed"
    else
      pkg install -y nodejs
  fi
done
echo "按 CTRL+c 退出"
while true;do
  node index.js
  echo "出现错误，已重连"
done