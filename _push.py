import paramiko, os, io

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key_path = os.path.expanduser("~/.ssh/ai_gf_deploy")
client.connect('asc.hk', port=3680, username='android', key_filename=key_path, timeout=15)

print("Pulling latest code...")
stdin, stdout, stderr = client.exec_command(
    "cd ~/my-ai-gf && git pull origin master && echo '---' && cd server && npm install && echo '---' && cd ../client && npm install && npm run build && echo '---BUILD OK---'",
    timeout=120
)
out = stdout.read().decode()
err = stderr.read().decode()
print(out)
if err: print("[stderr]", err[:500])

print("\nRestarting PM2...")
stdin, stdout, stderr = client.exec_command("pm2 restart ai-companion-server", timeout=30)
print(stdout.read().decode())

print("\nFinal status:")
stdin, stdout, stderr = client.exec_command("pm2 status", timeout=10)
print(stdout.read().decode())

client.close()
print("Done!")
