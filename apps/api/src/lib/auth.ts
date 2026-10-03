import crypto from "node:crypto";

export function validateWebAppData(telegramInitData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get('hash');
    
    if (!hash) return false;
    
    urlParams.delete('hash');
    
    const paramsList: string[] = [];
    urlParams.forEach((value, key) => {
      paramsList.push(`${key}=${value}`);
    });
    
    paramsList.sort();
    const dataCheckString = paramsList.join('\n');
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    return calculatedHash === hash;
  } catch (err) {
    return false;
  }
}

export function parseInitData(telegramInitData: string) {
  const urlParams = new URLSearchParams(telegramInitData);
  const userString = urlParams.get('user');
  
  if (!userString) return null;
  
  try {
    return JSON.parse(userString);
  } catch (err) {
    return null;
  }
}
