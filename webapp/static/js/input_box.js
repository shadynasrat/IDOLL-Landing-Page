export function inputBox_functions() {
    const plusButton = document.querySelector('.input-action-btn-circle');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const captureImageBtn = document.getElementById('capture-image-btn');
    const chatInputWrapper = document.querySelector('.chat-input-wrapper');
    const images = document.querySelectorAll('.message-image img');
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    const modalImage = document.getElementById('modalImage');

    // Event delegation for image clicks to handle dynamically inserted images
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('.message-image img')) {
            console.log('Image clicked, opening modal with src:', target.src);
            modalImage.src = target.src;
            modal.show();
        }
    });

    let selectedImage = null;
    let selectedImageUuid = null; // Properly declare selectedImageUuid

    // Function to upload an image to the server
    function uploadFileToServer(File) {
        const formData = new FormData();
        formData.append('file', File);

        return fetch(`/api/upload_file/${window.userId}/${window.currentChatId}`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                throw new Error('File upload failed on the server.');
            }
            return data.file_path; // Return the file path from the server response
        });
    }

    // Update the image upload handler to clear previous preview
    plusButton.addEventListener('click', () => {
        // close the image upload menu
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                uploadFileToServer(file)
                    .then(imageUrl => {
                        // Store the complete URL for display
                        selectedImage = imageUrl;
                        // Extract UUID from the URL for sending to backend
                        selectedImageUuid = imageUrl;
                        window.selectedImageUuid = selectedImageUuid; // Make it globally accessible
                        displayImagePreview(selectedImage);
                        
                        // Update send button state when image is added
                        if (window.updateSendButtonDisabledState) {
                            window.updateSendButtonDisabledState();
                        }
                    })
                    .catch(error => {
                        console.error('Error uploading image:', error);
                        showErrorNotification('Failed to upload image');
                    });
            }
        });
        fileInput.click();
    });

    // Display image preview in the input box
    function displayImagePreview(imageSrc) {
        let preview = document.querySelector('.image-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.className = 'image-preview';
            chatInputWrapper.prepend(preview);
        }
        preview.innerHTML = `<img src="${imageSrc}" alt="Image Preview" class="preview-thumbnail">
        <button type="button" class="remove-preview" onclick="removeImagePreview()">&times;</button>`;
    }
    
    // Make removeImagePreview function global so it can be called from HTML
    window.removeImagePreview = function() {
        const preview = document.querySelector('.image-preview');
        if (preview) {
            preview.remove();
        }
        selectedImage = null;
        selectedImageUuid = null;
        window.selectedImageUuid = null;
        
        // Update send button state when image is removed
        if (window.updateSendButtonDisabledState) {
            window.updateSendButtonDisabledState();
        }
    };
}