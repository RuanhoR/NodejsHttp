D=$(cd "$(dirname "$0")" && pwd)
cd "$D" || exit
echo "{}" > login.json
echo "[]" > chat.json
echo '{}' > verify.json
echo "========log========" > main.log