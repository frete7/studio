'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PixQRCodeProps {
  qrCodeText: string;
  amount: number;
  description?: string;
  className?: string;
}

export function PixQRCode({ qrCodeText, amount, description, className }: PixQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (canvasRef.current && qrCodeText) {
      QRCode.toCanvas(canvasRef.current, qrCodeText, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    }
  }, [qrCodeText]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText);
      toast({
        title: 'Código PIX copiado!',
        description: 'Cole o código no seu app bancário',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código PIX',
      });
    }
  };

  const downloadQRCode = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `pix-qr-${amount}-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className={`text-center space-y-4 ${className}`}>
      <div className="bg-white p-4 rounded-lg inline-block shadow-lg">
        <canvas
          ref={canvasRef}
          className="w-48 h-48"
          aria-label="QR Code PIX"
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Pagamento PIX</h3>
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(amount)}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium mb-2">Código PIX:</p>
          <div className="flex items-center justify-center gap-2">
            <code className="bg-muted px-3 py-2 rounded text-sm font-mono break-all max-w-xs">
              {qrCodeText}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              title="Copiar código PIX"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={downloadQRCode}
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar QR Code
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <p className="font-medium">Como pagar:</p>
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>Abra o app do seu banco</li>
          <li>Escolha a opção PIX</li>
          <li>Escaneie o QR Code ou cole o código</li>
          <li>Confirme o pagamento</li>
        </ol>
      </div>
    </div>
  );
}
